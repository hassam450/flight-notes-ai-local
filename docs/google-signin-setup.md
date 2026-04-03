# Google Sign-In Setup Guide for Flight Notes AI

This guide walks you through setting up Google Sign-In with Supabase for your React Native app.

## Prerequisites

- A Google Cloud Console account
- A Supabase project

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project name (e.g., "Flight Notes AI")

---

## Step 2: Configure OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace account)
3. Fill in the required fields:
   - **App name**: Flight Notes AI
   - **User support email**: Your email
   - **App logo**: (optional)
   - **Developer contact email**: Your email
4. Click **Save and Continue**
5. On Scopes page, click **Save and Continue** (default scopes are fine)
6. Add test users if in testing mode
7. Click **Save and Continue**

---

## Step 3: Create OAuth 2.0 Client IDs

### For Android:

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Android** as application type
4. Name it: "Flight Notes AI - Android"
5. Enter your package name: `com.flightnotesai.app`
6. Get your SHA-1 certificate fingerprint:
   ```bash
   # This project uses android/app/debug.keystore for debug signing
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
   Do not use `~/.android/debug.keystore` unless your Gradle signing config points to it.
7. Copy the SHA-1 fingerprint and paste it in the form
8. Click **Create**
9. **Note the Client ID** (you'll need this later)

### For iOS:

1. Click **Create Credentials** > **OAuth client ID**
2. Select **iOS** as application type
3. Name it: "Flight Notes AI - iOS"
4. Enter your bundle identifier: `com.flightnotesai.app`
5. Click **Create**
6. **Note the Client ID** (you'll need this later)

### For Web (Required for Supabase):

1. Click **Create Credentials** > **OAuth client ID**
2. Select **Web application** as application type
3. Name it: "Flight Notes AI - Web"
4. Under **Authorized JavaScript origins**, add:
   - `https://your-supabase-project-ref.supabase.co`
5. Under **Authorized redirect URIs**, add:
   - `https://your-supabase-project-ref.supabase.co/auth/v1/callback`
6. Click **Create**
7. **Note the Client ID and Client Secret** (you'll need these for Supabase)

---

## Step 4: Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **Providers**
4. Find **Google** and click to configure
5. Enable Google provider
6. Enter the credentials:
   - **Client ID**: Your Web OAuth Client ID from Step 3
   - **Client Secret**: Your Web OAuth Client Secret from Step 3
7. Click **Save**

---

## Step 5: Update Environment Variables

Update your `.env` file with the Google Client IDs:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

`@react-native-google-signin/google-signin` configure uses `webClientId` (and optionally `iosClientId`). Do not pass `androidClientId` to `GoogleSignin.configure()`.

---

## Step 6: Configure Android Native Project

The `@react-native-google-signin/google-signin` plugin should have automatically configured the Android project during prebuild. Verify:

1. Check `android/app/build.gradle` has the Google Play Services Auth dependency if needed by your local setup
2. Rebuild the native app after config changes (`npx expo run:android`)

`google-services.json` is not required for Supabase ID token flow with `@react-native-google-signin/google-signin`.

If not, add manually:

**In `android/app/build.gradle`:**

```gradle
dependencies {
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
}
```

## Step 7: Run the App

```bash
# Build and run on Android
npx expo run:android

# Or for a specific device
npx expo run:android --device
```

---

## Troubleshooting

### Error: "Google Play Services not available"

- Make sure Google Play Services is installed on your device/emulator
- Use a device with Google Play Services (not an AVD without Google APIs)

### Error: "Sign in was cancelled"

- Check your OAuth consent screen configuration
- Make sure the app is in testing mode and your email is added as a test user

### Error: "Invalid client"

- Verify your Client IDs are correct
- Make sure the package name matches exactly
- Verify SHA-1 fingerprint is correct

### Error: "Network error"

- Check your internet connection
- Verify Supabase URL is correct

---

## Testing Checklist

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] Android OAuth Client ID created with correct package name and SHA-1
- [ ] iOS OAuth Client ID created with correct bundle ID
- [ ] Web OAuth Client ID created with Supabase redirect URI
- [ ] Google provider enabled in Supabase
- [ ] Environment variables updated
- [ ] App builds and runs on device
- [ ] Google Sign-In button works
- [ ] User is redirected to main app after sign-in
