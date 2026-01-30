#!/bin/bash

# Arcana App - Keystore Setup Script
# This script creates your debug and release keystores and extracts SHA-1 fingerprints

set -e

echo "======================================"
echo "Arcana App - Keystore Setup"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    echo -e "${RED}Error: keytool command not found!${NC}"
    echo "Please install Java JDK or Android SDK first."
    echo ""
    echo "Install options:"
    echo "  - macOS: brew install openjdk"
    echo "  - Ubuntu/Debian: sudo apt-get install openjdk-11-jdk"
    echo "  - Windows: Download from https://www.oracle.com/java/technologies/downloads/"
    exit 1
fi

echo -e "${BLUE}Java/keytool found!${NC}"
echo ""

# Create .android directory if it doesn't exist
mkdir -p ~/.android

# ====================================
# STEP 1: Create/Verify Debug Keystore
# ====================================
echo -e "${YELLOW}Step 1: Setting up Debug Keystore${NC}"
echo "-----------------------------------"

if [ -f ~/.android/debug.keystore ]; then
    echo -e "${GREEN}✓ Debug keystore already exists${NC}"
else
    echo "Creating debug keystore..."
    keytool -genkey -v \
        -keystore ~/.android/debug.keystore \
        -alias androiddebugkey \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass android \
        -keypass android \
        -dname "CN=Android Debug,O=Android,C=US"

    echo -e "${GREEN}✓ Debug keystore created!${NC}"
fi

echo ""

# Extract Debug SHA-1
echo "Extracting Debug SHA-1 fingerprint..."
DEBUG_SHA1=$(keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep "SHA1:" | awk '{print $2}')
echo -e "${GREEN}✓ Debug SHA-1: ${BLUE}$DEBUG_SHA1${NC}"
echo ""

# ====================================
# STEP 2: Create Release Keystore
# ====================================
echo -e "${YELLOW}Step 2: Setting up Release Keystore${NC}"
echo "-----------------------------------"

RELEASE_KEYSTORE="android/arcana-release.keystore"
KEYSTORE_PASSWORD="ArcanaSecure2026!"

if [ -f "$RELEASE_KEYSTORE" ]; then
    echo -e "${GREEN}✓ Release keystore already exists at: $RELEASE_KEYSTORE${NC}"

    # Ask if they want to use existing or create new
    read -p "Do you want to keep the existing keystore? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating new release keystore..."
        rm -f "$RELEASE_KEYSTORE"

        keytool -genkey -v \
            -keystore "$RELEASE_KEYSTORE" \
            -alias arcana \
            -keyalg RSA \
            -keysize 2048 \
            -validity 10000 \
            -storepass "$KEYSTORE_PASSWORD" \
            -keypass "$KEYSTORE_PASSWORD" \
            -dname "CN=Arcana,OU=Development,O=Arcana,L=City,ST=State,C=US"

        echo -e "${GREEN}✓ New release keystore created!${NC}"
    fi
else
    echo "Creating release keystore..."
    mkdir -p android

    keytool -genkey -v \
        -keystore "$RELEASE_KEYSTORE" \
        -alias arcana \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass "$KEYSTORE_PASSWORD" \
        -keypass "$KEYSTORE_PASSWORD" \
        -dname "CN=Arcana,OU=Development,O=Arcana,L=City,ST=State,C=US"

    echo -e "${GREEN}✓ Release keystore created!${NC}"
fi

echo ""

# Extract Release SHA-1
echo "Extracting Release SHA-1 fingerprint..."
RELEASE_SHA1=$(keytool -list -v -keystore "$RELEASE_KEYSTORE" -alias arcana -storepass "$KEYSTORE_PASSWORD" -keypass "$KEYSTORE_PASSWORD" | grep "SHA1:" | awk '{print $2}')
echo -e "${GREEN}✓ Release SHA-1: ${BLUE}$RELEASE_SHA1${NC}"
echo ""

# ====================================
# STEP 3: Create keystore.properties
# ====================================
echo -e "${YELLOW}Step 3: Creating keystore.properties${NC}"
echo "-----------------------------------"

cat > android/keystore.properties << EOF
# Arcana Release Keystore Configuration
# KEEP THIS FILE SECRET - DO NOT COMMIT TO GIT

storeFile=arcana-release.keystore
storePassword=$KEYSTORE_PASSWORD
keyAlias=arcana
keyPassword=$KEYSTORE_PASSWORD
EOF

echo -e "${GREEN}✓ keystore.properties created at: android/keystore.properties${NC}"
echo ""

# ====================================
# STEP 4: Verify .gitignore
# ====================================
echo -e "${YELLOW}Step 4: Verifying .gitignore${NC}"
echo "-----------------------------------"

if ! grep -q "keystore.properties" android/.gitignore 2>/dev/null; then
    echo "keystore.properties" >> android/.gitignore
    echo "*.keystore" >> android/.gitignore
    echo "*.jks" >> android/.gitignore
    echo -e "${GREEN}✓ Added keystore files to .gitignore${NC}"
else
    echo -e "${GREEN}✓ .gitignore already configured${NC}"
fi
echo ""

# ====================================
# STEP 5: Save SHA-1 fingerprints
# ====================================
echo -e "${YELLOW}Step 5: Saving SHA-1 Fingerprints${NC}"
echo "-----------------------------------"

cat > android/SHA1_FINGERPRINTS.txt << EOF
# Arcana App - SHA-1 Certificate Fingerprints
# Generated: $(date)

## Debug SHA-1 (for development/testing)
$DEBUG_SHA1

## Release SHA-1 (for production/Play Store)
$RELEASE_SHA1

## Usage Instructions

### Add to Google Cloud Console:
1. Go to https://console.cloud.google.com
2. Select "TAROT LIFE" project
3. Go to APIs & Services → Credentials
4. Click on your Android OAuth Client ID
5. Add both SHA-1 fingerprints above
6. Save changes

### Keystore Locations:
- Debug: ~/.android/debug.keystore
- Release: android/arcana-release.keystore

### Keystore Passwords:
- Debug: android / android
- Release: See android/keystore.properties (keep secret!)

### IMPORTANT:
- NEVER commit keystore.properties to Git
- NEVER commit .keystore files to Git
- BACKUP your release keystore securely
- If you lose the release keystore, you cannot update your app in Play Store!
EOF

echo -e "${GREEN}✓ SHA-1 fingerprints saved to: android/SHA1_FINGERPRINTS.txt${NC}"
echo ""

# ====================================
# FINAL SUMMARY
# ====================================
echo ""
echo "======================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "======================================"
echo ""
echo -e "${BLUE}Your SHA-1 Fingerprints:${NC}"
echo ""
echo -e "${YELLOW}Debug SHA-1:${NC}"
echo -e "${BLUE}$DEBUG_SHA1${NC}"
echo ""
echo -e "${YELLOW}Release SHA-1:${NC}"
echo -e "${BLUE}$RELEASE_SHA1${NC}"
echo ""
echo "======================================"
echo -e "${YELLOW}Next Steps:${NC}"
echo "======================================"
echo ""
echo "1. ADD BOTH SHA-1 fingerprints to Google Cloud:"
echo "   → Go to: https://console.cloud.google.com"
echo "   → Project: TAROT LIFE"
echo "   → APIs & Services → Credentials"
echo "   → Edit your Android OAuth Client"
echo "   → Add both fingerprints above"
echo ""
echo "2. BACKUP your release keystore:"
echo "   → File: android/arcana-release.keystore"
echo "   → Password: See android/keystore.properties"
echo "   → Store in a secure location (password manager, encrypted drive)"
echo ""
echo "3. BUILD your app:"
echo "   → Debug: npm run android:run"
echo "   → Release: npm run android:release"
echo ""
echo -e "${RED}IMPORTANT:${NC}"
echo "• Your release keystore password is: $KEYSTORE_PASSWORD"
echo "• Save this password in a secure location!"
echo "• If you lose the keystore or password, you cannot update your app!"
echo ""
echo "All details saved to: android/SHA1_FINGERPRINTS.txt"
echo ""
echo -e "${GREEN}Ready to build and deploy! 🚀${NC}"
echo ""
