# Hunter Pace App 🐎

A comprehensive web application for managing Hunter Pace equestrian events, built with Next.js, Firebase, and Google Cloud Platform.

## Features

- **Event Management**: Create, edit, and manage Hunter Pace events
- **Team Registration**: Register teams with rider information
- **Division Management**: Set up divisions with optimal times
- **Real-time Timing**: Track start/finish times and calculate results
- **Results & Leaderboards**: View and export event results
- **User Authentication**: Secure user accounts and role-based access
- **File Storage**: Upload event images and documents
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Firebase Functions, Express.js
- **Database**: Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Hosting**: Firebase Hosting
- **Cloud Platform**: Google Cloud Platform

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud CLI (optional, for advanced GCP features)

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd Hunter-Pace-app-2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. **Set up environment variables** (CRITICAL SECURITY STEP):
   ```bash
   # Run the security setup script
   ./setup-security.sh
   
   # OR manually:
   cp env.example .env.local
   mkdir -p .secrets
   # Edit .env.local with your Firebase configuration
   # Download Firebase service account key to .secrets/firebase-functions-key.json
   ```
   
   ⚠️ **SECURITY WARNING**: Never commit `.env.local` or files in `.secrets/` to version control!

4. **Start development environment**:
   ```bash
   ./setup-development.sh
   ```

This will start:
- Firebase emulators (Auth, Firestore, Storage, Functions)
- Next.js development server
- Emulator UI at http://localhost:4000

### Production Deployment

1. **Set up Firebase project** (see [GCP Setup Guide](gcp-setup.md))
2. **Deploy to production**:
   ```bash
   ./deploy.sh
   ```

## Project Structure

```
Hunter-Pace-app-2/
├── src/                    # Next.js application source
│   ├── app/               # App router pages and layouts
│   ├── components/        # React components
│   │   ├── auth/         # Authentication components
│   │   └── ui/           # Reusable UI components
│   ├── contexts/          # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries and Firebase config
│   ├── services/         # Firebase service layer
│   └── types/            # TypeScript type definitions
├── functions/             # Firebase Cloud Functions
│   ├── src/              # TypeScript source code
│   ├── package.json      # Functions dependencies
│   └── tsconfig.json     # TypeScript configuration
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore database indexes
├── storage.rules          # Firebase Storage rules
├── deploy.sh              # Production deployment script
└── setup-development.sh   # Development environment setup
```

## Firebase Services

### Authentication
- Email/password authentication
- User profile management
- Role-based access control

### Firestore Database
- Events collection with subcollections for divisions, teams, and results
- User profiles and preferences
- Real-time data synchronization

### Cloud Functions
- RESTful API endpoints
- Event processing and results calculation
- File upload handling
- Background tasks and scheduled functions

### Storage
- Event images and documents
- User profile pictures
- Results exports

### Hosting
- Static file serving
- Custom domain support
- CDN distribution

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signout` - User sign out

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get specific event
- `POST /api/events` - Create/update event
- `DELETE /api/events/:id` - Delete event

### Event Data
- `GET /api/events/:id/divisions` - Get event divisions
- `GET /api/events/:id/teams` - Get event teams
- `GET /api/events/:id/results` - Get event results
- `GET /api/events/:id/export` - Export results to CSV

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### File Upload
- `POST /api/upload/:type/:id` - Upload files

## Security Rules

### Firestore Rules
- Public read access to events and results
- Authenticated users can create/edit their own events
- Event organizers can manage their event data
- Admin users have additional privileges

### Storage Rules
- Public read access to event content
- Authenticated users can upload files
- Users can only manage their own profile pictures

## Development

### Running Locally
```bash
# Start Firebase emulators
firebase emulators:start

# Start Next.js dev server (in another terminal)
npm run dev
```

### Testing
```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Build for production
npm run build
```

### Firebase Functions Development
```bash
cd functions
npm run build:watch  # Watch mode for development
npm run serve        # Serve functions locally
```

## Deployment

### Automatic Deployment
```bash
./deploy.sh
```

This script will:
1. Install dependencies
2. Build the application
3. Deploy Firebase Functions
4. Deploy Firestore rules and indexes
5. Deploy Storage rules
6. Deploy hosting

### Manual Deployment
```bash
# Deploy specific services
firebase deploy --only functions
firebase deploy --only firestore
firebase deploy --only storage
firebase deploy --only hosting
```

## Environment Variables

🔐 **SECURITY NOTICE**: If you cloned this repository, the previous Firebase credentials were exposed and must be rotated! See [SECURITY.md](SECURITY.md) for immediate action steps.

Create a `.env.local` file with:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Functions URL
NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-your_project.cloudfunctions.net

# GCP Configuration
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account_key.json
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [GCP Setup Guide](gcp-setup.md)
- **Issues**: Create an issue in the GitHub repository
- **Firebase Help**: [Firebase Documentation](https://firebase.google.com/docs)
- **GCP Help**: [Google Cloud Documentation](https://cloud.google.com/docs)

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics and reporting
- [ ] Payment integration for event registration
- [ ] Email notifications and reminders
- [ ] Social media integration
- [ ] Multi-language support
- [ ] Advanced user roles and permissions
- [ ] API rate limiting and monitoring
- [ ] Automated testing and CI/CD
- [ ] Performance optimization and caching