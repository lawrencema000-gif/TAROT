import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Plus, Trash2, Sparkles, RotateCcw } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { useAuth } from '../context/AuthContext';
import { ARCHETYPAL_OBJECTS, type ArchetypalObject } from '../data/archetypalObjects';

/**
 * Archetypal sandbox — a 3D Three.js scene where the user places small
 * symbolic objects (owl, sword, crown, tree, …) on a circular plinth.
 * When they tap "Read the arrangement," the names + positions are sent
 * to the AI oracle, which interprets the layout.
 *
 * This is Sprint 20 of the roadmap — explicitly marked optional. Ships
 * as a preview behind the `sandbox` flag (default OFF). The three.js SDK
 * is split into its own vendor-three lazy chunk (see vite.config) so the
 * main bundle never pays for it.
 *
 * Interpretation reuses the ai-quick-reading edge function with a synthetic
 * "question" that summarizes the arrangement.
 */

interface Placed {
  id: string;       // instance id
  archetype: ArchetypalObject;
  x: number;        // -1.0 … 1.0 (arena radius)
  z: number;        // -1.0 … 1.0
  y: number;        // resting height
}

export function SandboxPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypalObject | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [loadingInterpretation, setLoadingInterpretation] = useState(false);
  const [threeReady, setThreeReady] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const sceneRef = useRef<{
    renderer: unknown;
    scene: unknown;
    camera: unknown;
    disposeFns: Array<() => void>;
    // mesh registry per placed id
    meshes: Record<string, unknown>;
  } | null>(null);

  // Initialize Three.js scene (lazy-imported so three never enters main bundle)
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    (async () => {
      let THREE: typeof import('three');
      try {
        THREE = await import('three');
      } catch (err) {
        setWebglError(err instanceof Error ? err.message : 'Failed to load 3D engine');
        return;
      }
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 320;

      // Some Android WebView builds disable WebGL; constructing the renderer
      // throws. Fall back to the static panel instead of crashing the page.
      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      } catch (err) {
        setWebglError(err instanceof Error ? err.message : 'WebGL not supported');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);

      const scene = new THREE.Scene();
      scene.background = null;

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.set(0, 2.6, 3.8);
      camera.lookAt(0, 0, 0);

      // Plinth: thin cylinder + subtle rings
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.08, 64),
        new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.9 }),
      );
      scene.add(plinth);

      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.4 + i * 0.4, 0.008, 16, 96),
          new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.12 }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.05;
        scene.add(ring);
      }

      // Lights
      const dir = new THREE.DirectionalLight(0xffffff, 1);
      dir.position.set(3, 4, 3);
      scene.add(dir);
      scene.add(new THREE.AmbientLight(0x404858, 1.2));

      const meshes: Record<string, THREE.Mesh> = {};
      sceneRef.current = {
        renderer,
        scene,
        camera,
        disposeFns: [],
        meshes,
      };

      // Slow auto-rotate camera for a little life
      let angle = 0;
      let frame = 0;
      const render = () => {
        frame = requestAnimationFrame(render);
        angle += 0.002;
        camera.position.x = Math.sin(angle) * 3.8;
        camera.position.z = Math.cos(angle) * 3.8;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };
      render();

      const onResize = () => {
        const nw = canvas.clientWidth || 320;
        const nh = canvas.clientHeight || 320;
        renderer.setSize(nw, nh, false);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', onResize);
        // Dispose every mesh in the scene — geometries, materials, textures.
        // Without this, revisiting SandboxPage leaks GPU memory each cycle.
        scene.traverse((obj) => {
          const mesh = obj as import('three').Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const m of mats) m.dispose();
          }
        });
        renderer.dispose();
      };

      setThreeReady(true);
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // Sync placed → meshes
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !threeReady) return;
    (async () => {
      const THREE = await import('three');
      const scene = s.scene as import('three').Scene;
      const meshes = s.meshes as Record<string, import('three').Mesh>;

      // Remove meshes for unplaced ids
      for (const id of Object.keys(meshes)) {
        if (!placed.find((p) => p.id === id)) {
          scene.remove(meshes[id]);
          meshes[id].geometry.dispose();
          const mat = meshes[id].material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as import('three').Material).dispose();
          delete meshes[id];
        }
      }
      // Add / update
      for (const p of placed) {
        let mesh = meshes[p.id];
        if (!mesh) {
          const g = p.archetype.geometry === 'sphere'     ? new THREE.SphereGeometry(0.22 * p.archetype.scale, 24, 24)
                  : p.archetype.geometry === 'cone'       ? new THREE.ConeGeometry(0.22 * p.archetype.scale, 0.5 * p.archetype.scale, 24)
                  : p.archetype.geometry === 'cylinder'   ? new THREE.CylinderGeometry(0.12 * p.archetype.scale, 0.12 * p.archetype.scale, 0.55 * p.archetype.scale, 24)
                  : p.archetype.geometry === 'box'        ? new THREE.BoxGeometry(0.36 * p.archetype.scale, 0.36 * p.archetype.scale, 0.36 * p.archetype.scale)
                  : p.archetype.geometry === 'torus'      ? new THREE.TorusGeometry(0.2 * p.archetype.scale, 0.06 * p.archetype.scale, 16, 40)
                  : new THREE.OctahedronGeometry(0.26 * p.archetype.scale);
          const mat = new THREE.MeshStandardMaterial({
            color: p.archetype.color,
            roughness: 0.5,
            metalness: 0.2,
          });
          mesh = new THREE.Mesh(g, mat);
          meshes[p.id] = mesh;
          scene.add(mesh);
        }
        mesh.position.set(p.x * 1.25, p.y + 0.15, p.z * 1.25);
      }
    })();
  }, [placed, threeReady]);

  const place = useCallback(() => {
    if (!selectedArchetype) return;
    const instanceId = `${selectedArchetype.id}-${Date.now()}`;
    // Place in a gentle spiral so consecutive placements don't stack.
    const angle = placed.length * 0.9;
    const radius = 0.35 + placed.length * 0.06;
    setPlaced((prev) => [
      ...prev,
      {
        id: instanceId,
        archetype: selectedArchetype,
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        y: 0.08,
      },
    ]);
  }, [selectedArchetype, placed.length]);

  const reset = () => {
    setPlaced([]);
    setInterpretation(null);
  };

  const interpret = async () => {
    if (placed.length < 2) {
      toast(t('sandbox.placeMore', { defaultValue: 'Place at least two objects.' }), 'info');
      return;
    }
    setLoadingInterpretation(true);
    setInterpretation(null);
    const layoutDescription = placed.map((p) => {
      const direction =
        p.x < -0.3 ? 'west' : p.x > 0.3 ? 'east'
        : p.z < -0.3 ? 'north' : p.z > 0.3 ? 'south'
        : 'centre';
      return `${p.archetype.name} (${direction})`;
    }).join(', ');
    const meanings = Array.from(new Set(placed.map((p) => p.archetype.meaning))).join(' / ');

    const question = `I arranged these archetypal objects on a plinth: ${layoutDescription}. What is the reading? (Symbolic meanings drawn from: ${meanings})`;

    const { data, error } = await supabase.functions.invoke('ai-quick-reading', {
      body: {
        question,
        userContext: {
          mbtiType: profile?.mbtiType,
          locale: getLocale(),
          displayName: profile?.displayName,
        },
      },
    });
    setLoadingInterpretation(false);
    if (error) {
      toast(t('sandbox.interpretFailed', { defaultValue: 'Could not interpret.' }), 'error');
      return;
    }
    const payload = (data?.data ?? data) as { reading?: string } | null;
    if (payload?.reading) setInterpretation(payload.reading);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <Box className="w-6 h-6 text-gold" />
        <h1 className="heading-display-lg text-mystic-100">
          {t('sandbox.title', { defaultValue: 'Archetypal sandbox' })}
        </h1>
      </div>

      <Card padding="lg" variant="glow">
        <p className="text-sm text-mystic-300 leading-relaxed">
          {t('sandbox.intro', {
            defaultValue:
              'Pick symbolic objects, place them on the plinth, and the oracle reads the arrangement. Preview release — positions are spiralled automatically, drag-drop is coming.',
          })}
        </p>
      </Card>

      <Card padding="md" className="overflow-hidden">
        {webglError ? (
          <div
            className="flex flex-col items-center justify-center text-center p-6"
            style={{ minHeight: 320 }}
          >
            <Box className="w-10 h-10 text-mystic-500 mb-3" />
            <p className="text-sm font-medium text-mystic-300 mb-1">
              {t('sandbox.webglUnavailableTitle', { defaultValue: '3D preview is not available' })}
            </p>
            <p className="text-xs text-mystic-500 max-w-xs leading-relaxed">
              {t('sandbox.webglUnavailableBody', {
                defaultValue:
                  "Your browser or device doesn't support WebGL. You can still place archetypal objects and get an interpretation — the reading doesn't require the 3D view.",
              })}
            </p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 320, display: 'block', borderRadius: 12 }}
            aria-label="Archetypal sandbox 3D scene"
          />
        )}
      </Card>

      <Card padding="lg">
        <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-2">
          {t('sandbox.pickObject', { defaultValue: 'Choose an object' })}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ARCHETYPAL_OBJECTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedArchetype(a)}
              className={`p-2 rounded-lg border transition-all text-center ${
                selectedArchetype?.id === a.id
                  ? 'bg-gold/15 border-gold/40'
                  : 'bg-mystic-800/40 border-mystic-700/40 hover:border-mystic-600'
              }`}
            >
              <div
                className="w-6 h-6 rounded-full mx-auto mb-1"
                style={{ backgroundColor: a.color, opacity: 0.8 }}
              />
              <p className="text-[10px] text-mystic-300 truncate">{a.name}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="primary" onClick={place} disabled={!selectedArchetype} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            {t('sandbox.place', { defaultValue: 'Place on plinth' })}
          </Button>
          <Button variant="outline" onClick={reset} disabled={placed.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" />
            {t('sandbox.reset', { defaultValue: 'Reset' })}
          </Button>
        </div>
      </Card>

      {placed.length > 0 && (
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-widest text-mystic-500">
              {t('sandbox.placedLabel', { defaultValue: 'On the plinth' })}
            </p>
            <span className="text-[10px] text-mystic-500">{placed.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {placed.map((p) => (
              <span
                key={p.id}
                className="text-[11px] px-2 py-0.5 bg-mystic-800 text-mystic-300 rounded-full"
              >
                {p.archetype.name}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Button
        variant="gold"
        fullWidth
        onClick={interpret}
        disabled={placed.length < 2 || loadingInterpretation}
        className="min-h-[52px]"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {loadingInterpretation
          ? t('sandbox.reading', { defaultValue: 'Reading the arrangement…' })
          : t('sandbox.interpretCta', { defaultValue: 'Read the arrangement' })}
      </Button>

      {interpretation && (
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <p className="text-[10px] uppercase tracking-widest text-gold">
              {t('sandbox.readingLabel', { defaultValue: 'The oracle reads' })}
            </p>
          </div>
          <p className="text-sm text-mystic-300 leading-relaxed whitespace-pre-line">{interpretation}</p>
          <Button variant="outline" size="sm" onClick={reset} className="mt-3">
            <RotateCcw className="w-3 h-3 mr-1" />
            {t('sandbox.rearrange', { defaultValue: 'Rearrange' })}
          </Button>
        </Card>
      )}

      <p className="text-[10px] text-center text-mystic-600 italic">
        {t('sandbox.preview', { defaultValue: 'Preview — drag-to-place and save/share are coming.' })}
      </p>
    </div>
  );
}

export default SandboxPage;
