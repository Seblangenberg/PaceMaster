# Firebase Setup Guide

The sign-up issue you're experiencing is because Firebase is not properly configured. Here's how to fix it:

## Problem
Your `.env.local` file contains placeholder values like `your_api_key_here` instead of actual Firebase configuration values.

## Solution

### Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or use an existing project
3. Follow the setup wizard

### Step 2: Get Your Firebase Configuration
1. In your Firebase project, click the gear icon (⚙️) → "Project settings"
2. Scroll down to "Your apps" section
3. If you don't have a web app, click "Add app" → Web (</>) icon
4. Register your app with a name like "Hunter Pace App"
5. Copy the config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Step 3: Update Your Environment File
Edit `/Users/sebastianlangenberg/Desktop/hunter-pace-app-2/.env.local` and replace the placeholder values:

```bash
# Replace these values with your actual Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Step 4: Enable Authentication
1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable "Email/Password" authentication
3. Optionally enable Google, Facebook, Twitter if you want social login

### Step 5: Set up Firestore Database
1. Go to "Firestore Database" → "Create database"
2. Choose "Start in test mode" for now
3. Select a location close to your users

### Step 6: Restart Your Development Server
After updating `.env.local`, restart your Next.js development server:

```bash
npm run dev
# or
yarn dev
```

## Testing
After completing these steps:
1. Try the sign-up flow again
2. Check the browser console for any Firebase-related errors
3. The sign-up should now work properly

## Common Issues
- **"Firebase configuration error"**: Check that all environment variables are set correctly
- **"Invalid API key"**: Make sure you copied the API key exactly
- **"Permission denied"**: Check Firestore security rules if you get database errors

## Security Note
The `.env.local` file is already in `.gitignore`, so your Firebase credentials won't be committed to version control.