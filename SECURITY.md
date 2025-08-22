# 🔐 Security Guide for Hunter Pace App

## 🚨 IMMEDIATE ACTION REQUIRED

**If you're seeing this document, your Firebase credentials were previously exposed and need to be rotated immediately!**

## 🔄 Credential Rotation Process

### 1. Firebase Service Account Key

**CRITICAL: The previous firebase-functions-key.json was exposed. You MUST:**

1. **Revoke the existing service account key:**
   ```bash
   # Go to Firebase Console > Project Settings > Service Accounts
   # Find the compromised key and click "Delete"
   ```

2. **Generate a new service account key:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Rename it to `firebase-functions-key.json`
   - Place it in the `.secrets/` directory

3. **Update your environment:**
   ```bash
   # Make sure the path in .env.local points to the new key
   GOOGLE_APPLICATION_CREDENTIALS=./.secrets/firebase-functions-key.json
   ```

### 2. Firebase API Keys

**If the hardcoded keys were used in production, rotate them:**

1. **Go to Google Cloud Console:**
   - Navigate to [Google Cloud Console](https://console.cloud.google.com)
   - Select your Firebase project
   - Go to APIs & Services > Credentials

2. **Regenerate API keys:**
   - Find your API key(s)
   - Click on each key and select "Regenerate key"
   - Update your `.env.local` file with new keys

3. **Update Firebase configuration:**
   - Go to Firebase Console > Project Settings > General
   - If needed, reset your app configuration

## 📋 Security Checklist

### ✅ Immediate Steps (Completed)

- [x] Removed sensitive files from repository
- [x] Updated .gitignore to prevent future exposure
- [x] Removed hardcoded credentials from source code
- [x] Created secure environment variable setup
- [x] Created this security documentation

### ⚠️ Action Required by You

- [ ] **Generate new Firebase service account key**
- [ ] **Rotate Firebase API keys if compromised**
- [ ] **Set up .env.local with new credentials**
- [ ] **Test the application with new credentials**
- [ ] **Enable Firebase security monitoring**

## 🛡️ Security Best Practices

### Environment Variables

1. **Never commit these files:**
   ```
   .env.local
   .env.production
   firebase-functions-key.json
   Any file in .secrets/ directory
   ```

2. **Always use environment variables for:**
   - API keys
   - Database URLs
   - Authentication secrets
   - Third-party service credentials

### Firebase Security

1. **Firestore Rules:**
   - Review your Firestore rules regularly
   - Use the principle of least privilege
   - Test rules with the Firebase emulator

2. **Storage Rules:**
   - Ensure file upload restrictions
   - Validate file types and sizes
   - Implement user-based access control

3. **Authentication:**
   - Enable multi-factor authentication
   - Set up email verification
   - Configure password policies

### Development Security

1. **Local Development:**
   ```bash
   # Use Firebase emulators for local development
   firebase emulators:start
   ```

2. **Never use production credentials in development**

3. **Regular security audits:**
   ```bash
   # Check for vulnerable dependencies
   npm audit
   
   # Update dependencies regularly
   npm update
   ```

## 🔧 Setup Instructions

### 1. Initial Setup

```bash
# Copy environment template
cp env.example .env.local

# Create secrets directory
mkdir -p .secrets

# Place your new Firebase service account key
# Download from Firebase Console and save as:
# .secrets/firebase-functions-key.json
```

### 2. Configure Environment

Edit `.env.local` with your Firebase project details:

```bash
# Required Firebase configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_new_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Path to service account key
GOOGLE_APPLICATION_CREDENTIALS=./.secrets/firebase-functions-key.json
```

### 3. Verify Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Check for missing environment variables in console
```

## 🚨 Emergency Response

### If Credentials Are Compromised

1. **Immediately rotate all affected credentials**
2. **Review access logs in Firebase Console**
3. **Check for unauthorized access or data changes**
4. **Update all deployment environments**
5. **Notify team members of the security incident**

### Monitoring

1. **Set up Firebase alerts:**
   - Unusual authentication patterns
   - High API usage
   - Failed authentication attempts

2. **Regular reviews:**
   - Monthly security audit
   - Quarterly credential rotation
   - Annual penetration testing

## 📞 Support

If you need help with security setup:

1. **Firebase Documentation:** https://firebase.google.com/docs/admin/setup
2. **Google Cloud Security:** https://cloud.google.com/security
3. **Firebase Security Rules:** https://firebase.google.com/docs/rules

## 🔒 Additional Security Measures

### Production Deployment

1. **Use different Firebase projects for staging and production**
2. **Implement CI/CD security scanning**
3. **Set up monitoring and alerting**
4. **Regular security updates**

### Code Security

1. **Input validation on all user inputs**
2. **SQL injection prevention (even for NoSQL)**
3. **XSS protection**
4. **CSRF protection**
5. **Rate limiting on API endpoints**

---

**Remember: Security is an ongoing process, not a one-time setup. Stay vigilant and keep your credentials secure!**