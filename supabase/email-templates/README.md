# Arcana — Localized Supabase Auth Email Templates

Supabase doesn't natively dispatch different email templates per locale, so the
approach here is a single multilingual template per email type. Each template
shows the primary call-to-action in all four supported languages (EN, JA, KO,
ZH) stacked vertically, with the CTA button as a single link that includes
`?lang=xx` so the landing page renders in the user's chosen language.

Why this approach:
1. Supabase auth emails are triggered by the client and use the template set in
   the Supabase dashboard at Auth → Email Templates. There's one template per
   event (confirm, recovery, invite, magic link, email change).
2. The client passes `options.data.locale` in `signUp()` which stores the
   locale on `auth.users.raw_user_meta_data.locale`. Templates can access this
   as `{{ .Data.locale }}`, but conditional logic in templates is limited, and
   this breaks if the user has no JS (edge case: email confirmation from a
   different browser than the one they signed up in).
3. A short multilingual block is cognitively cheap for non-target-language
   users to skip, and guarantees the right-language reader can always complete
   the action without copy-pasting the raw link.

## Deployment

In the Supabase dashboard → **Authentication** → **Email Templates**, paste
each of the HTML files below into the corresponding template:

- `confirm-signup.html` → **Confirm signup**
- `reset-password.html` → **Reset Password**
- `magic-link.html` → **Magic Link**
- `change-email.html` → **Change Email Address**
- `invite.html` → **Invite user**

Subject lines (set in the dashboard's "Subject" field above the template):

| Template | Subject (all 4 languages, separated by `/`) |
|---|---|
| Confirm signup | `Confirm your Arcana email / メールアドレスを確認 / 이메일 확인 / 确认您的电子邮箱` |
| Reset Password | `Reset your Arcana password / パスワードリセット / 비밀번호 재설정 / 重置密码` |
| Magic Link | `Your Arcana sign-in link / ログインリンク / 로그인 링크 / 登录链接` |
| Change Email | `Confirm your new Arcana email / 新しいメールアドレス確認 / 새 이메일 확인 / 确认新邮箱` |
| Invite | `You're invited to Arcana / Arcanaへの招待 / Arcana 초대 / Arcana邀请` |
