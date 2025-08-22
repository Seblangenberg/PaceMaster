# Google Cloud Platform (GCP) Setup Guide

This guide will help you set up the complete GCP infrastructure for your Hunter Pace app.

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account with billing enabled
2. **Google Cloud CLI**: Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
3. **Firebase CLI**: Install Firebase CLI globally: `npm install -g firebase-tools`

## Step 1: Create a New GCP Project

```bash
# Create a new project
gcloud projects create hunter-pace-app --name="Hunter Pace App"

# Set the project as default
gcloud config set project hunter-pace-app

# Enable billing for the project
# Note: You'll need to do this manually in the GCP Console
```

## Step 2: Enable Required APIs

```bash
# Enable Firebase API
gcloud services enable firebase.googleapis.com

# Enable Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Enable Firestore API
gcloud services enable firestore.googleapis.com

# Enable Cloud Storage API
gcloud services enable storage.googleapis.com

# Enable Identity and Access Management (IAM) API
gcloud services enable iam.googleapis.com

# Enable Cloud Resource Manager API
gcloud services enable cloudresourcemanager.googleapis.com

# Enable Cloud Scheduler API (for scheduled functions)
gcloud services enable cloudscheduler.googleapis.com
```

## Step 3: Set Up Firebase Project

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select the following services:
# - Hosting
# - Functions
# - Firestore
# - Storage
# - Emulators
```

## Step 4: Configure Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Select your project**
3. **Set up Authentication**:
   - Go to Authentication > Sign-in method
   - Enable Email/Password authentication
   - Optionally enable Google, Facebook, or other providers

4. **Set up Firestore Database**:
   - Go to Firestore Database
   - Create database in production mode
   - Choose a location (recommend: us-central1 for best performance)

5. **Set up Storage**:
   - Go to Storage
   - Get started with default rules
   - Choose a location (same as Firestore)

6. **Set up Functions**:
   - Go to Functions
   - Note the region (usually us-central1)

## Step 5: Create Service Account

```bash
# Create a service account for Firebase Functions
gcloud iam service-accounts create firebase-functions-sa \
    --display-name="Firebase Functions Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding hunter-pace-app \
    --member="serviceAccount:firebase-functions-sa@hunter-pace-app.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

gcloud projects add-iam-policy-binding hunter-pace-app \
    --member="serviceAccount:firebase-functions-sa@hunter-pace-app.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create and download the key
gcloud iam service-accounts keys create ~/firebase-functions-key.json \
    --iam-account=firebase-functions-sa@hunter-pace-app.iam.gserviceaccount.com
```

## Step 6: Configure Environment Variables

1. **Copy the environment example**:
   ```bash
   cp env.example .env.local
   ```

2. **Update `.env.local` with your Firebase config**:
   ```bash
   # Get these values from Firebase Console > Project Settings > General
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=hunter-pace-app.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=hunter-pace-app
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hunter-pace-app.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   
   # Functions URL
   NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-hunter-pace-app.cloudfunctions.net
   
   # GCP Project
   GOOGLE_CLOUD_PROJECT=hunter-pace-app
   GOOGLE_APPLICATION_CREDENTIALS=~/firebase-functions-key.json
   ```

## Step 7: Set Up Custom Domain (Optional)

1. **In Firebase Console**:
   - Go to Hosting
   - Click "Add custom domain"
   - Follow the verification steps

2. **Update DNS records** as instructed by Firebase

## Step 8: Configure Security Rules

The security rules are already configured in:
- `firestore.rules` - Database access rules
- `storage.rules` - File storage rules

## Step 9: Deploy Your App

```bash
# Make scripts executable
chmod +x deploy.sh
chmod +x setup-development.sh

# Deploy to production
./deploy.sh

# Or set up development environment
./setup-development.sh
```

## Step 10: Monitor and Scale

### Firebase Console
- **Analytics**: Monitor app usage and performance
- **Crashlytics**: Track app crashes and issues
- **Performance**: Monitor app performance metrics

### Google Cloud Console
- **IAM & Admin**: Manage service accounts and permissions
- **Billing**: Monitor costs and set budgets
- **Logs**: View detailed logs for debugging
- **Monitoring**: Set up alerts and dashboards

## Cost Optimization

1. **Set up billing alerts** in GCP Console
2. **Use Firebase Spark Plan** for development (free tier)
3. **Monitor Firestore usage** and optimize queries
4. **Use Cloud Functions sparingly** (pay per invocation)
5. **Implement caching** to reduce database reads

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive data
3. **Implement proper authentication** and authorization
4. **Regularly review security rules**
5. **Enable Firebase App Check** for production
6. **Use HTTPS everywhere**

## Troubleshooting

### Common Issues

1. **Functions deployment fails**:
   - Check if billing is enabled
   - Verify service account permissions
   - Check function logs in Firebase Console

2. **Authentication issues**:
   - Verify Firebase config in environment variables
   - Check if Authentication is enabled in Firebase Console

3. **Database access denied**:
   - Review Firestore security rules
   - Check if user is authenticated
   - Verify collection/document paths

### Getting Help

- **Firebase Documentation**: https://firebase.google.com/docs
- **Google Cloud Documentation**: https://cloud.google.com/docs
- **Firebase Community**: https://firebase.google.com/community
- **Stack Overflow**: Tag with `firebase` and `google-cloud-platform`

## Next Steps

After completing this setup:

1. **Test your app** thoroughly in development
2. **Set up CI/CD** pipeline for automated deployments
3. **Implement monitoring** and alerting
4. **Plan for scaling** as your user base grows
5. **Consider additional GCP services** like Cloud Run, Cloud SQL, etc.

