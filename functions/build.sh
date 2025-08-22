#!/bin/bash

echo "🔨 Building Firebase Functions..."

# Navigate to functions directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf lib/

# Build TypeScript
echo "⚡ Compiling TypeScript..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful! Functions are ready for deployment."
    echo "📁 Build output: lib/"
else
    echo "❌ Build failed"
    exit 1
fi

