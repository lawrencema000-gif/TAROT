@echo off
REM Arcana App - Keystore Setup Script for Windows
REM This script creates your debug and release keystores and extracts SHA-1 fingerprints

echo ======================================
echo Arcana App - Keystore Setup
echo ======================================
echo.

REM Check if keytool is available
where keytool >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: keytool command not found!
    echo Please install Java JDK or Android SDK first.
    echo.
    echo Install options:
    echo   - Download Java JDK from: https://www.oracle.com/java/technologies/downloads/
    echo   - Or install Android Studio which includes Java
    pause
    exit /b 1
)

echo Java/keytool found!
echo.

REM Create .android directory if it doesn't exist
if not exist "%USERPROFILE%\.android" mkdir "%USERPROFILE%\.android"

REM ====================================
REM STEP 1: Create/Verify Debug Keystore
REM ====================================
echo Step 1: Setting up Debug Keystore
echo -----------------------------------

if exist "%USERPROFILE%\.android\debug.keystore" (
    echo [OK] Debug keystore already exists
) else (
    echo Creating debug keystore...
    keytool -genkey -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
    echo [OK] Debug keystore created!
)

echo.

REM Extract Debug SHA-1
echo Extracting Debug SHA-1 fingerprint...
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | findstr "SHA1:" > temp_debug_sha1.txt
for /f "tokens=2" %%a in (temp_debug_sha1.txt) do set DEBUG_SHA1=%%a
del temp_debug_sha1.txt
echo [OK] Debug SHA-1: %DEBUG_SHA1%
echo.

REM ====================================
REM STEP 2: Create Release Keystore
REM ====================================
echo Step 2: Setting up Release Keystore
echo -----------------------------------

set RELEASE_KEYSTORE=android\arcana-release.keystore
set KEYSTORE_PASSWORD=ArcanaSecure2026!

if exist "%RELEASE_KEYSTORE%" (
    echo [OK] Release keystore already exists at: %RELEASE_KEYSTORE%
    echo Using existing keystore...
) else (
    echo Creating release keystore...
    if not exist "android" mkdir android

    keytool -genkey -v -keystore "%RELEASE_KEYSTORE%" -alias arcana -keyalg RSA -keysize 2048 -validity 10000 -storepass "%KEYSTORE_PASSWORD%" -keypass "%KEYSTORE_PASSWORD%" -dname "CN=Arcana,OU=Development,O=Arcana,L=City,ST=State,C=US"

    echo [OK] Release keystore created!
)

echo.

REM Extract Release SHA-1
echo Extracting Release SHA-1 fingerprint...
keytool -list -v -keystore "%RELEASE_KEYSTORE%" -alias arcana -storepass "%KEYSTORE_PASSWORD%" -keypass "%KEYSTORE_PASSWORD%" | findstr "SHA1:" > temp_release_sha1.txt
for /f "tokens=2" %%a in (temp_release_sha1.txt) do set RELEASE_SHA1=%%a
del temp_release_sha1.txt
echo [OK] Release SHA-1: %RELEASE_SHA1%
echo.

REM ====================================
REM STEP 3: Create keystore.properties
REM ====================================
echo Step 3: Creating keystore.properties
echo -----------------------------------

(
echo # Arcana Release Keystore Configuration
echo # KEEP THIS FILE SECRET - DO NOT COMMIT TO GIT
echo.
echo storeFile=arcana-release.keystore
echo storePassword=%KEYSTORE_PASSWORD%
echo keyAlias=arcana
echo keyPassword=%KEYSTORE_PASSWORD%
) > android\keystore.properties

echo [OK] keystore.properties created at: android\keystore.properties
echo.

REM ====================================
REM STEP 4: Save SHA-1 fingerprints
REM ====================================
echo Step 4: Saving SHA-1 Fingerprints
echo -----------------------------------

(
echo # Arcana App - SHA-1 Certificate Fingerprints
echo # Generated: %date% %time%
echo.
echo ## Debug SHA-1 ^(for development/testing^)
echo %DEBUG_SHA1%
echo.
echo ## Release SHA-1 ^(for production/Play Store^)
echo %RELEASE_SHA1%
echo.
echo ## Usage Instructions
echo.
echo ### Add to Google Cloud Console:
echo 1. Go to https://console.cloud.google.com
echo 2. Select "TAROT LIFE" project
echo 3. Go to APIs ^& Services -^> Credentials
echo 4. Click on your Android OAuth Client ID
echo 5. Add both SHA-1 fingerprints above
echo 6. Save changes
echo.
echo ### Keystore Locations:
echo - Debug: %USERPROFILE%\.android\debug.keystore
echo - Release: android\arcana-release.keystore
echo.
echo ### Keystore Passwords:
echo - Debug: android / android
echo - Release: See android\keystore.properties ^(keep secret!^)
echo.
echo ### IMPORTANT:
echo - NEVER commit keystore.properties to Git
echo - NEVER commit .keystore files to Git
echo - BACKUP your release keystore securely
echo - If you lose the release keystore, you cannot update your app in Play Store!
) > android\SHA1_FINGERPRINTS.txt

echo [OK] SHA-1 fingerprints saved to: android\SHA1_FINGERPRINTS.txt
echo.

REM ====================================
REM FINAL SUMMARY
REM ====================================
echo.
echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo Your SHA-1 Fingerprints:
echo.
echo Debug SHA-1:
echo %DEBUG_SHA1%
echo.
echo Release SHA-1:
echo %RELEASE_SHA1%
echo.
echo ======================================
echo Next Steps:
echo ======================================
echo.
echo 1. ADD BOTH SHA-1 fingerprints to Google Cloud:
echo    -^> Go to: https://console.cloud.google.com
echo    -^> Project: TAROT LIFE
echo    -^> APIs ^& Services -^> Credentials
echo    -^> Edit your Android OAuth Client
echo    -^> Add both fingerprints above
echo.
echo 2. BACKUP your release keystore:
echo    -^> File: android\arcana-release.keystore
echo    -^> Password: See android\keystore.properties
echo    -^> Store in a secure location ^(password manager, encrypted drive^)
echo.
echo 3. BUILD your app:
echo    -^> Debug: npm run android:run
echo    -^> Release: npm run android:release
echo.
echo IMPORTANT:
echo * Your release keystore password is: %KEYSTORE_PASSWORD%
echo * Save this password in a secure location!
echo * If you lose the keystore or password, you cannot update your app!
echo.
echo All details saved to: android\SHA1_FINGERPRINTS.txt
echo.
echo Ready to build and deploy!
echo.
pause
