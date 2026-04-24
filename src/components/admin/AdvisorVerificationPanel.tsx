import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Check, X, Eye, Clock } from 'lucide-react';
import { Button, toast } from '../ui';
import { supabase } from '../../lib/supabase';

/**
 * Admin-only panel to review pending advisor verifications. Lists rows
 * from public.advisor_verifications, lets an admin preview the ID image
 * and selfie video (via signed URLs), then approve or reject with notes.
 */

interface VerificationRow {
  id: string;
  user_id: string;
  legal_name: string;
  country: string;
  id_document_path: string;
  selfie_video_path: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function AdvisorVerificationPanel() {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, { idUrl: string; videoUrl: string }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('advisor_verifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!showAll) q = q.eq('status', 'pending');
    const { data, error } = await q;
    if (error) {
      toast(error.message, 'error');
    } else {
      setRows((data ?? []) as VerificationRow[]);
    }
    setLoading(false);
  }, [showAll]);

  useEffect(() => { if (expanded) load(); }, [expanded, load]);

  const ensurePreview = async (row: VerificationRow) => {
    if (previewUrls[row.id]) return;
    const [idRes, vidRes] = await Promise.all([
      supabase.storage.from('advisor-verification').createSignedUrl(row.id_document_path, 60 * 10),
      supabase.storage.from('advisor-verification').createSignedUrl(row.selfie_video_path, 60 * 10),
    ]);
    if (!idRes.data?.signedUrl || !vidRes.data?.signedUrl) {
      toast('Could not load preview', 'error');
      return;
    }
    setPreviewUrls((prev) => ({
      ...prev,
      [row.id]: { idUrl: idRes.data.signedUrl, videoUrl: vidRes.data.signedUrl },
    }));
  };

  const decide = async (row: VerificationRow, decision: 'approved' | 'rejected') => {
    const { error } = await supabase.rpc('advisor_verification_decide', {
      p_verification_id: row.id,
      p_decision: decision,
      p_notes: notes[row.id] || null,
    });
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast(decision === 'approved' ? 'Approved' : 'Rejected', 'success');
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  return (
    <div className="bg-mystic-900/60 border border-mystic-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-mystic-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-gold" />
          <div>
            <h3 className="font-medium text-mystic-100">Advisor Verifications</h3>
            <p className="text-xs text-mystic-500">{rows.length} in queue</p>
          </div>
        </div>
        <div className="text-mystic-500 text-xs">{expanded ? '▲' : '▼'}</div>
      </button>

      {expanded && (
        <div className="p-4 border-t border-mystic-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-mystic-400 cursor-pointer">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-gold" />
              Show all (incl. decided)
            </label>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {rows.length === 0 && !loading && (
            <p className="text-xs text-mystic-500 italic">No verifications in queue.</p>
          )}

          {rows.map((row) => {
            const preview = previewUrls[row.id];
            return (
              <div key={row.id} className="p-3 border border-mystic-800/80 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-mystic-100">{row.legal_name}</p>
                    <p className="text-[10px] text-mystic-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(row.created_at).toLocaleString()} · {row.country}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    row.status === 'pending' ? 'bg-cosmic-blue/20 text-cosmic-blue'
                    : row.status === 'approved' ? 'bg-emerald-400/20 text-emerald-400'
                    : 'bg-pink-400/20 text-pink-400'
                  }`}>
                    {row.status}
                  </span>
                </div>

                <p className="text-[10px] text-mystic-500 font-mono mb-2">user: {row.user_id.slice(0, 12)}</p>

                {!preview ? (
                  <Button variant="ghost" size="sm" onClick={() => ensurePreview(row)} className="gap-1">
                    <Eye className="w-3 h-3" /> Load preview
                  </Button>
                ) : (
                  <div className="space-y-2 mb-3">
                    <div>
                      <p className="text-[10px] uppercase text-mystic-500 mb-1">ID</p>
                      <img src={preview.idUrl} alt="ID" className="max-h-48 rounded border border-mystic-800" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-mystic-500 mb-1">Selfie video</p>
                      <video src={preview.videoUrl} controls className="max-h-48 rounded border border-mystic-800 w-full" />
                    </div>
                  </div>
                )}

                {row.status === 'pending' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={notes[row.id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder="Notes (optional)"
                      className="w-full bg-mystic-900 border border-mystic-700/50 rounded-lg px-3 py-1.5 text-xs text-mystic-100 placeholder-mystic-600 focus:outline-none focus:border-gold/40"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => decide(row, 'rejected')} className="flex-1">
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => decide(row, 'approved')} className="flex-1">
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
