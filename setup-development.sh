#!/bin/bash

echo "🔧 Setting up Hunter Pace App development environment..."

# Navigate to project directory
cd "$(dirname "$0")"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please log in to Firebase..."
    firebase login
fi

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Install Firebase Functions dependencies
echo "📦 Installing Firebase Functions dependencies..."
cd functions
npm install
cd ..

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cp env.example .env.local
    echo "⚠️  Please update .env.local with your Firebase configuration"
fi

# Initialize Firebase project if not already done
if [ ! -f .firebaserc ]; then
    echo "🚀 Initializing Firebase project..."
    firebase init
fi

# Start Firebase emulators
echo "🚀 Starting Firebase emulators..."
echo "This will start local versions of:"
echo "  - Authentication (port 9099)"
echo "  - Firestore (port 8080)"
echo "  - Storage (port 9199)"
echo "  - Functions (port 5001)"
echo "  - Emulator UI (port 4000)"
echo ""
echo "Press Ctrl+C to stop emulators"
echo ""

# Start emulators in background
firebase emulators:start &
EMULATOR_PID=$!

# Wait for emulators to start
sleep 10

# Check if emulators are running
if curl -s http://localhost:4000 > /dev/null; then
    echo "✅ Emulators started successfully!"
    echo ""
    echo "🌐 Emulator UI: http://localhost:4000"
    echo "🔐 Auth: http://localhost:9099"
    echo "🗄️ Firestore: http://localhost:8080"
    echo "📁 Storage: http://localhost:9199"
    echo "⚡ Functions: http://localhost:5001"
    echo ""
    echo "🚀 Starting Next.js development server..."
    echo "Your app will be available at: http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop both emulators and Next.js"
    
    # Start Next.js dev server
    npm run dev &
    NEXT_PID=$!
    
    # Wait for either process to exit
    wait $EMULATOR_PID $NEXT_PID
    
    # Clean up background processes
    kill $EMULATOR_PID 2>/dev/null
    kill $NEXT_PID 2>/dev/null
    
else
    echo "❌ Failed to start emulators"
    kill $EMULATOR_PID 2>/dev/null
    exit 1
fi

