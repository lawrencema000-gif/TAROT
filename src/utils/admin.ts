const ADMIN_EMAIL = 'lawrence.ma000@gmail.com';

export function isAdminEmail(email: string | undefined | null): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export function isAdmin(user: { email?: string | null } | null | undefined): boolean {
  return isAdminEmail(user?.email);
}
