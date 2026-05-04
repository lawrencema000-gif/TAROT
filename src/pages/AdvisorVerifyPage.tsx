import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, Check, AlertCircle, Clock, XCircle } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * Self-serve advisor verification flow. Three-step UX:
 *   1. Name + country
 *   2. Upload government ID (image)
 *   3. Upload a short selfie video
 *   → submit for admin review.
 *
 * Files land in the advisor-verification Supabase Storage bucket under
 * <user_id>/. Paths are stored on the verification row; admins review in
 * AdminPage. After approval, the advisor_profiles row flips to is_hidden=false.
 */

type VerifyStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface Verification {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  legal_name: string;
  country: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export function AdvisorVerifyPage() {
  const { t } = useT('app');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [legalName, setLegalName] = useState('');
  const [country, setCountry] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('advisor_verifications')
      .select('id, status, legal_name, country, admin_notes, created_at, reviewed_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setExisting(data as Verification);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user) return;
    if (legalName.trim().length < 2 || country.length !== 2 || !idFile || !selfieFile) {
      toast(t('advisorVerify.incomplete', { defaultValue: 'Fill in every field and upload both files.' }), 'error');
      return;
    }
    setSubmitting(true);

    const ts = Date.now();
    const idPath     = `${user.id}/id-${ts}-${idFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const selfiePath = `${user.id}/selfie-${ts}-${selfieFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const up1 = await supabase.storage.from('advisor-verification').upload(idPath, idFile, {
      cacheControl: '3600', upsert: false,
    });
    if (up1.error) {
      setSubmitting(false);
      toast(up1.error.message, 'error');
      return;
    }
    const up2 = await supabase.storage.from('advisor-verification').upload(selfiePath, selfieFile, {
      cacheControl: '3600', upsert: false,
    });
    if (up2.error) {
      setSubmitting(false);
      toast(up2.error.message, 'error');
      return;
    }

    const { error: insErr } = await supabase.from('advisor_verifications').insert({
      user_id: user.id,
      id_document_path: idPath,
      selfie_video_path: selfiePath,
      legal_name: legalName.trim(),
      country: country.toUpperCase(),
      status: 'pending',
    });
    setSubmitting(false);
    if (insErr) {
      toast(insErr.message, 'error');
      return;
    }
    toast(t('advisorVerify.submitted', { defaultValue: 'Submitted. We\'ll review within 72 hours.' }), 'success');
    load();
  };

  if (loading) return <div className="py-12 text-center text-mystic-500">{t('common:actions.loading', { defaultValue: 'Loading…' })}</div>;

  const status: VerifyStatus = existing?.status || 'none';

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-gold" />
        <h1 className="heading-display-lg text-mystic-100">
          {t('advisorVerify.title', { defaultValue: 'Advisor verification' })}
        </h1>
      </div>

      {status === 'pending' && existing && (
        <Card padding="lg" variant="glow" className="bg-cosmic-blue/5 border-cosmic-blue/30">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-cosmic-blue flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg text-mystic-100 mb-1">
                {t('advisorVerify.pendingTitle', { defaultValue: 'Under review' })}
              </h3>
              <p className="text-sm text-mystic-400 leading-relaxed">
                {t('advisorVerify.pendingBody', {
                  defaultValue: 'Submitted {{date}}. We review within 72 hours.',
                  date: new Date(existing.created_at).toLocaleDateString(),
                })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {status === 'approved' && existing && (
        <Card padding="lg" className="border-emerald-400/30 bg-emerald-400/5">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg text-emerald-400 mb-1">
                {t('advisorVerify.approvedTitle', { defaultValue: 'Verified' })}
              </h3>
              <p className="text-sm text-mystic-300">
                {t('advisorVerify.approvedBody', { defaultValue: 'Your advisor profile is live in the directory.' })}
              </p>
              <Button variant="ghost" size="sm" onClick={() => navigate('/advisors/dashboard')} className="mt-2">
                {t('advisorVerify.goDashboard', { defaultValue: 'Open dashboard' })}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {status === 'rejected' && existing && (
        <Card padding="lg" className="border-pink-400/30 bg-pink-400/5">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg text-pink-400 mb-1">
                {t('advisorVerify.rejectedTitle', { defaultValue: 'Not approved' })}
              </h3>
              {existing.admin_notes && (
                <p className="text-sm text-mystic-300 mb-2">
                  <span className="text-mystic-500">{t('advisorVerify.reasonLabel', { defaultValue: 'Reason:' })} </span>
                  {existing.admin_notes}
                </p>
              )}
              <p className="text-xs text-mystic-400">
                {t('advisorVerify.rejectedHelp', {
                  defaultValue: 'Contact advisors@tarotlife.app if you believe this is wrong.',
                })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {status === 'none' && (
        <>
          <Card padding="lg" variant="glow">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-lg text-mystic-100 mb-1">
                  {t('advisorVerify.startTitle', { defaultValue: 'Verify to go live' })}
                </h3>
                <p className="text-sm text-mystic-400 leading-relaxed">
                  {t('advisorVerify.startBody', {
                    defaultValue: 'Before clients can book you, we confirm identity. Upload a government ID plus a short selfie video saying your full name and today\'s date. Reviewed within 72 hours.',
                  })}
                </p>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <label className="block text-xs uppercase tracking-widest text-mystic-500 mb-1">
              {t('advisorVerify.legalNameLabel', { defaultValue: 'Legal name' })}
            </label>
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={120} />
            <label className="block text-xs uppercase tracking-widest text-mystic-500 mb-1 mt-3">
              {t('advisorVerify.countryLabel', { defaultValue: 'Country (2-letter code, e.g. US)' })}
            </label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              className="uppercase tracking-widest"
            />
          </Card>

          <Card padding="lg">
            <label className="block text-xs uppercase tracking-widest text-mystic-500 mb-2">
              {t('advisorVerify.idLabel', { defaultValue: 'Government ID (image)' })}
            </label>
            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              variant={idFile ? 'outline' : 'primary'}
              onClick={() => idInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {idFile ? idFile.name : t('advisorVerify.uploadId', { defaultValue: 'Upload ID' })}
            </Button>
          </Card>

          <Card padding="lg">
            <label className="block text-xs uppercase tracking-widest text-mystic-500 mb-2">
              {t('advisorVerify.selfieLabel', { defaultValue: 'Selfie video (say your name + today\'s date)' })}
            </label>
            <input
              ref={selfieInputRef}
              type="file"
              accept="video/*"
              capture="user"
              onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              variant={selfieFile ? 'outline' : 'primary'}
              onClick={() => selfieInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {selfieFile ? selfieFile.name : t('advisorVerify.uploadSelfie', { defaultValue: 'Upload video' })}
            </Button>
          </Card>

          <Button
            variant="gold"
            fullWidth
            onClick={submit}
            disabled={submitting || !legalName || country.length !== 2 || !idFile || !selfieFile}
            className="min-h-[52px]"
          >
            {submitting
              ? t('advisorVerify.submitting', { defaultValue: 'Submitting…' })
              : t('advisorVerify.submitCta', { defaultValue: 'Submit for review' })}
          </Button>

          <p className="text-[10px] text-center text-mystic-600 italic">
            {t('advisorVerify.privacyNote', {
              defaultValue: 'Documents are encrypted and only visible to admin reviewers.',
            })}
          </p>
        </>
      )}
    </div>
  );
}

export default AdvisorVerifyPage;
