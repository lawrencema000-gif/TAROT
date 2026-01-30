# Google OAuth Credentials for Android

## Android OAuth 2.0 Client

| Field | Value |
|-------|-------|
| **Client ID** | `726369845321-21scndirulav3927098rm82e8m8rdl62.apps.googleusercontent.com` |
| **Project ID** | `tarot-life-485720` |
| **Type** | Installed Application (Android) |

## Associated Certificate Fingerprints

| Algorithm | Fingerprint |
|-----------|-------------|
| **SHA-1** | `3C:AE:04:22:C3:B4:14:17:90:DF:AE:EF:28:75:66:31:83:92:F8:C6` |
| **SHA-256** | `B2:89:11:EB:4A:81:29:D2:B7:2E:12:BE:4F:87:38:02:15:B4:05:5B:0F:53:29:F6:97:CC:29:66:26:97:E4:F8` |

## Package Information

| Field | Value |
|-------|-------|
| **Package Name** | `com.arcana.app` |
| **Redirect URI** | `com.arcana.app://auth` |

## OAuth Endpoints

| Endpoint | URL |
|----------|-----|
| **Auth URI** | `https://accounts.google.com/o/oauth2/auth` |
| **Token URI** | `https://oauth2.googleapis.com/token` |
| **Certs URL** | `https://www.googleapis.com/oauth2/v1/certs` |

---

## Supabase Configuration Required

To complete Android Google Sign-In setup, add the following in Supabase Dashboard:

1. Go to **Authentication > Providers > Google**
2. Add the Android Client ID to the **Authorized Client IDs** field:
   ```
   726369845321-21scndirulav3927098rm82e8m8rdl62.apps.googleusercontent.com
   ```
3. Enable **Skip nonce check** (required for mobile apps)
4. Ensure redirect URL `com.arcana.app://auth` is in **Redirect URLs**

This Client ID works alongside the web Client ID - no conflicts will occur.
