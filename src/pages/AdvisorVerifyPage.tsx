import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, Check, AlertCircle, Clock, XCircle, FileImage, Video } from 'lucide-react';
import { Card, Button, Input, PageHeader, Page, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * Self-serve advisor verification flow, on one card:
 *   1. Legal name + country (an ISO 3166-1 select, named in the user's locale)
 *   2. Government ID (image)
 *   3. A short selfie video
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

/** ISO 3166-1 alpha-2, the 249 officially assigned codes. Names come from Intl. */
const ISO_COUNTRIES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
  'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

function countryOptions(locale: string): Array<{ code: string; name: string }> {
  let names: { of(code: string): string | undefined } | null = null;
  try {
    names = new Intl.DisplayNames([locale, 'en'], { type: 'region' });
  } catch {
    names = null;
  }
  return ISO_COUNTRIES.map((code) => ({ code, name: names?.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

const FIELD_LABEL = 'block text-ui font-medium text-mystic-300 mb-2';
const SELECT_CLASS =
  'w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control px-3 py-3 min-h-[48px] text-ui text-mystic-100 focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/20';

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
  const countries = useMemo(() => countryOptions(getLocale()), []);

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

  const complete = legalName.trim().length >= 2 && country.length === 2 && !!idFile && !!selfieFile;

  const submit = async () => {
    if (!user) return;
    if (!complete || !idFile || !selfieFile) {
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
      toast(t('advisorVerify.uploadIdFailed', { defaultValue: 'Couldn’t upload your ID — check your connection and try again.' }), 'error');
      return;
    }
    const up2 = await supabase.storage.from('advisor-verification').upload(selfiePath, selfieFile, {
      cacheControl: '3600', upsert: false,
    });
    if (up2.error) {
      setSubmitting(false);
      toast(t('advisorVerify.uploadVideoFailed', { defaultValue: 'Couldn’t upload your video — check your connection and try again.' }), 'error');
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
      toast(t('advisorVerify.submitFailed', { defaultValue: 'Couldn’t submit your verification — try again in a moment.' }), 'error');
      console.error('[AdvisorVerify] insert failed:', insErr.message);
      return;
    }
    toast(t('advisorVerify.submitted', { defaultValue: 'Submitted. We’ll review within 72 hours.' }), 'success');
    load();
  };

  if (loading) return <div className="py-12 text-center text-mystic-500 text-ui">{t('common:actions.loading', { defaultValue: 'Loading…' })}</div>;

  const status: VerifyStatus = existing?.status || 'none';

  return (
    <Page spacing="md">
      <PageHeader
        icon={<Shield />}
        title={t('advisorVerify.title', { defaultValue: 'Advisor verification' })}
        onBack={() => navigate(-1)}
        backLabel={t('common:actions.back', { defaultValue: 'Back' }) as string}
      />

      {status === 'pending' && existing && (
        <Card padding="lg" variant="glow" className="bg-cosmic-blue/5 border-cosmic-blue/30">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-cosmic-blue-ink flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <h2 className="heading-display-md text-mystic-100 mb-1">
                {t('advisorVerify.pendingTitle', { defaultValue: 'Under review' })}
              </h2>
              <p className="text-ui text-mystic-400 leading-relaxed">
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
        <Card padding="lg" className="border-teal/25 bg-teal/10">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <h2 className="heading-display-md text-teal mb-1">
                {t('advisorVerify.approvedTitle', { defaultValue: 'Verified' })}
              </h2>
              <p className="text-ui text-mystic-300">
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
        <Card padding="lg" className="border-coral/25 bg-coral/10">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-coral flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <h2 className="heading-display-md text-coral mb-1">
                {t('advisorVerify.rejectedTitle', { defaultValue: 'Not approved' })}
              </h2>
              {existing.admin_notes && (
                <p className="text-ui text-mystic-300 mb-2">
                  <span className="text-mystic-500">{t('advisorVerify.reasonLabel', { defaultValue: 'Reason:' })} </span>
                  {existing.admin_notes}
                </p>
              )}
              <p className="text-meta text-mystic-400">
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
              <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <h2 className="heading-display-md text-mystic-100 mb-1">
                  {t('advisorVerify.startTitle', { defaultValue: 'Verify to go live' })}
                </h2>
                <p className="text-ui text-mystic-400 leading-relaxed">
                  {t('advisorVerify.startBody', {
                    defaultValue: 'Before clients can book you, we confirm identity. Upload a government ID plus a short selfie video saying your full name and today’s date. Reviewed within 72 hours.',
                  })}
                </p>
              </div>
            </div>
          </Card>

          {/* One form, one card: name, country, the two uploads. */}
          <Card padding="lg" className="space-y-5">
            <Input
              label={t('advisorVerify.legalNameLabel', { defaultValue: 'Legal name' })}
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              maxLength={120}
              autoComplete="name"
            />

            <div>
              <label htmlFor="advisor-verify-country" className={FIELD_LABEL}>
                {t('advisorVerify.countryLabel', { defaultValue: 'Country' })}
              </label>
              <select
                id="advisor-verify-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={SELECT_CLASS}
                autoComplete="country"
              >
                <option value="">{t('advisorVerify.countryPlaceholder', { defaultValue: 'Choose a country' })}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <p className={FIELD_LABEL} id="advisor-verify-id-label">
                {t('advisorVerify.idLabel', { defaultValue: 'Government ID (image)' })}
              </p>
              <input
                ref={idInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                className="hidden"
                aria-labelledby="advisor-verify-id-label"
              />
              <Button
                variant={idFile ? 'outline' : 'secondary'}
                onClick={() => idInputRef.current?.click()}
                fullWidth
              >
                {idFile ? <FileImage className="w-4 h-4" aria-hidden /> : <Upload className="w-4 h-4" aria-hidden />}
                <span className="truncate">{idFile ? idFile.name : t('advisorVerify.uploadId', { defaultValue: 'Upload ID' })}</span>
              </Button>
            </div>

            <div>
              <p className={FIELD_LABEL} id="advisor-verify-selfie-label">
                {t('advisorVerify.selfieLabel', { defaultValue: 'Selfie video (say your name and today’s date)' })}
              </p>
              <input
                ref={selfieInputRef}
                type="file"
                accept="video/*"
                capture="user"
                onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                className="hidden"
                aria-labelledby="advisor-verify-selfie-label"
              />
              <Button
                variant={selfieFile ? 'outline' : 'secondary'}
                onClick={() => selfieInputRef.current?.click()}
                fullWidth
              >
                {selfieFile ? <Video className="w-4 h-4" aria-hidden /> : <Upload className="w-4 h-4" aria-hidden />}
                <span className="truncate">{selfieFile ? selfieFile.name : t('advisorVerify.uploadSelfie', { defaultValue: 'Upload my verification video' })}</span>
              </Button>
            </div>
          </Card>

          <Button
            size="lg"
            variant="gold"
            fullWidth
            onClick={submit}
            disabled={submitting || !complete}
            loading={submitting}
          >
            {submitting
              ? t('advisorVerify.submitting', { defaultValue: 'Submitting…' })
              : t('advisorVerify.submitCta', { defaultValue: 'Submit for review' })}
          </Button>

          <p className="text-caption text-center text-mystic-500">
            {t('advisorVerify.privacyNote', {
              defaultValue: 'Documents are encrypted and only visible to admin reviewers.',
            })}
          </p>
        </>
      )}
    </Page>
  );
}

export default AdvisorVerifyPage;
