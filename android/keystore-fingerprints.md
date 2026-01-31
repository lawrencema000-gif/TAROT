# Android Keystore Certificate Fingerprints

These fingerprints are required for configuring Google services, Firebase, OAuth, and other Android integrations.

## Local Debug/Release Keystore

### Certificate Details

| Field | Value |
|-------|-------|
| **Owner** | CN=Lawrence Ma, OU=NA, O=developer, L=Sydney, ST=New South Wales, C=au |
| **Issuer** | CN=Lawrence Ma, OU=NA, O=developer, L=Sydney, ST=New South Wales, C=au |
| **Serial Number** | 1 |
| **Valid From** | Fri Jan 16 01:15:10 GMT+09:00 2026 |
| **Valid Until** | Tue Jan 10 01:15:10 GMT+09:00 2051 |
| **Signature Algorithm** | SHA256withRSA |
| **Public Key Algorithm** | 2048-bit RSA key |

### Certificate Fingerprints

#### SHA-1
```
3C:AE:04:22:C3:B4:14:17:90:DF:AE:EF:28:75:66:31:83:92:F8:C6
```

#### SHA-256
```
B2:89:11:EB:4A:81:29:D2:B7:2E:12:BE:4F:87:38:02:15:B4:05:5B:0F:53:29:F6:97:CC:29:66:26:97:E4:F8
```

---

## Google Play App Signing Key

### Certificate Fingerprints

#### SHA-1
```
4E:05:4F:EE:6E:2B:D5:13:B5:9A:AC:79:67:F5:D3:8A:BB:2B:EB:F9
```

**Source:** Google Play Console > Setup > App signing > App signing key certificate

---

## Usage

These fingerprints are used for:
- Google Sign-In / OAuth configuration
- Firebase project setup
- Google Play App Signing
- API key restrictions in Google Cloud Console
- Deep linking verification

**Important:** You need to configure OAuth with BOTH fingerprints:
1. Local keystore SHA-1 (for development and testing)
2. Play Store SHA-1 (for production releases)
