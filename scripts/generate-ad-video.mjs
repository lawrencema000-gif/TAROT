/**
 * Generate a 15-second ad video by stitching the 5 variant creatives
 * together with 0.5s crossfades.
 *
 * Output: ad-creatives/ad-15s.mp4  (1200x628, H.264, ~2MB)
 *         ad-creatives/ad-15s-square.mp4 (1200x1200)
 *
 * Requires ffmpeg on PATH. Run: node scripts/generate-ad-video.mjs
 */
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';

const ROOT = resolve('ad-creatives');
const VARIANTS = ['v1', 'v2', 'v3', 'v4', 'v5'];
const SECONDS_PER_SLIDE = 3;
const FADE_DURATION = 0.5;

function renderVideo({ suffix, outPath }) {
  const inputs = VARIANTS.flatMap(v => [
    '-loop', '1',
    '-t', String(SECONDS_PER_SLIDE),
    '-i', resolve(ROOT, v, suffix),
  ]);

  // Build a filter chain: each slide fades in from black on its own timeline,
  // then all slides are concatenated into a single track.
  // Using xfade between consecutive slides for smooth crossfades.
  const n = VARIANTS.length;
  const filters = [];

  // Label each input with its fade-in/out applied
  for (let i = 0; i < n; i++) {
    filters.push(`[${i}:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS,setsar=1[v${i}]`);
  }

  // xfade cascade. The output of each xfade has duration
  //   prevDuration + nextDuration - FADE_DURATION
  // and the next slide should start fading in at
  //   prevDuration - FADE_DURATION
  // so offset is measured against the cumulative length of `prev`.
  let prev = 'v0';
  let prevDuration = SECONDS_PER_SLIDE;
  for (let i = 1; i < n; i++) {
    const next = `v${i}`;
    const out = i === n - 1 ? 'out' : `x${i}`;
    const offset = prevDuration - FADE_DURATION;
    filters.push(`[${prev}][${next}]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset}[${out}]`);
    prev = out;
    prevDuration = prevDuration + SECONDS_PER_SLIDE - FADE_DURATION;
  }

  const filterGraph = filters.join(';');

  const args = [
    '-y',
    ...inputs,
    '-filter_complex', filterGraph,
    '-map', '[out]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '22',
    '-movflags', '+faststart',
    outPath,
  ];

  const result = spawnSync('ffmpeg', args, { stdio: ['inherit', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    console.error(result.stderr?.toString().slice(-800));
    throw new Error(`ffmpeg failed with status ${result.status}`);
  }
  console.log(`✓ ${outPath}`);
}

function main() {
  // Verify source images exist
  for (const v of VARIANTS) {
    const landscape = resolve(ROOT, v, 'landscape-1200x628.jpg');
    const square = resolve(ROOT, v, 'square-1200.jpg');
    if (!existsSync(landscape) || !existsSync(square)) {
      throw new Error(`Missing source images — run generate-ad-images.mjs first`);
    }
  }

  renderVideo({
    suffix: 'landscape-1200x628.jpg',
    outPath: resolve(ROOT, 'ad-15s-landscape.mp4'),
  });

  renderVideo({
    suffix: 'square-1200.jpg',
    outPath: resolve(ROOT, 'ad-15s-square.mp4'),
  });

  console.log('\nDone. Upload to Google Ads as a video asset.');
}

main();
