/**
 * Korean particles that agree with the word before them (이/가, 을/를, 은/는,
 * 과/와, 으로/로, 이에요/예요, …).
 *
 * One implementation, shared with the edge functions: the canonical file is
 * supabase/functions/_shared/ko-josa.ts (as src/schema re-exports
 * supabase/functions/_schema), so a sentence the server builds and one the
 * client builds pick their particles the same way.
 */
export {
  finalConsonant,
  koParticle,
  withKoParticle,
  resolveKoParticles,
  fillKoTemplate,
} from '../../supabase/functions/_shared/ko-josa';
