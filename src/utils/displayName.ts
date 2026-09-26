/**
 * What to call the person.
 *
 * Sign-up stores the email's local part as the display name, and OAuth
 * gives us whatever the provider had. Both can be a handle — `j.doe`,
 * `arcana-qa-auth-1776994003021` — and a handle in a greeting reads as a
 * bug. Home had this heuristic privately; the onboarding pages greeted
 * the raw value. Now everything that says a name says the same one.
 */

/** Capitalise a part that arrived all in lower case; leave "McDonald" alone. */
function cap(part: string): string {
  return part === part.toLowerCase() ? part.charAt(0).toUpperCase() + part.slice(1) : part;
}

/** A name fit for a greeting, or '' when the value looks machine-made. */
export function friendlyDisplayName(raw: string | null | undefined): string {
  if (!raw) return '';
  const name = raw.trim();
  if (!name) return '';

  // A real name has a space in it (an OAuth profile, a name the user typed):
  // "Jean-Paul Sartre", "Dr. Jane Doe". Used as given.
  if (/\s/.test(name) && !name.includes('@')) return name;

  // Everything else is a handle: an email's local part or a one-word id.
  const local = name.includes('@') ? name.split('@')[0] : name;

  // Long, digit-heavy or dash-heavy handles are generated.
  const tooManyDashes = (local.match(/-/g)?.length ?? 0) >= 3;
  const mostlyDigits = (local.match(/\d/g)?.length ?? 0) / Math.max(local.length, 1) > 0.4;
  if (local.length > 20 || tooManyDashes || mostlyDigits) return '';

  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map(cap)
    .join(' ');
}

/**
 * The display name to store at sign-up. Title-cased from the email's local
 * part (`j.doe` → `J Doe`, `maria_s` → `Maria S`); trailing digits are
 * dropped (`lawrence99` → `Lawrence`). Falls back to the raw local part so
 * the column is never empty.
 */
export function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const stripped = local.replace(/\d+$/, '');
  const friendly = friendlyDisplayName(stripped || local);
  return friendly || local;
}
