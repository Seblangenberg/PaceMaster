# Development Startup Guide

## Starting the RideRelease Backend and PaceMaster Frontend

This guide will help you start both the backend API (RideRelease) and the frontend application (PaceMaster) to test the connection.

### Prerequisites

1. **Node.js** (version 18 or higher)
2. **npm** or **yarn**
3. Both applications should be installed with dependencies

### Step 1: Install Dependencies

**For the Backend (RideRelease):**
```bash
cd "/Users/sebastianlangenberg/Desktop/Ride Release"
npm install
```

**For the Frontend (PaceMaster):**
```bash
cd "/Users/sebastianlangenberg/Desktop/Hunter-Pace-app-2"
npm install
```

### Step 2: Start the Backend Server

Open a terminal and run:
```bash
cd "/Users/sebastianlangenberg/Desktop/Ride Release"
npm run dev
```

The backend should start on **http://localhost:8080**

You should see output similar to:
```
Server running in development mode on port 8080
```

### Step 3: Start the Frontend Application

Open a **second terminal window** and run:
```bash
cd "/Users/sebastianlangenberg/Desktop/Hunter-Pace-app-2"
npm run dev
```

The frontend should start on **http://localhost:3000**

### Step 4: Test the Connection

1. Open your browser and go to **http://localhost:3000**
2. You should see the PaceMaster login page
3. Click on the **"API Test"** tab (first tab)
4. Click the **"Test Backend Connection"** button
5. If successful, you should see a green "Connection Successful" message with backend details

### Troubleshooting

**Backend Not Starting:**
- Make sure port 8080 is not already in use
- Check for any error messages in the terminal
- Ensure all dependencies are installed (`npm install`)

**Frontend Not Starting:**
- Make sure port 3000 is not already in use
- Check for any error messages in the terminal
- Ensure all dependencies are installed (`npm install`)

**Connection Test Failing:**
- Verify the backend is running on port 8080
- Check that the API_BASE_URL in `.env.local` is correct
- Look at browser dev tools for any CORS errors
- Ensure both servers are running simultaneously

### Expected API Test Results

When the connection test is successful, you should see:
```json
{
  "success": true,
  "message": "RideRelease API Server - Digital Waiver Management for Equestrian Facilities",
  "version": "1.0.0",
  "environment": "development",
  "endpoints": {
    "health": "/health",
    "api": "/api/v1",
    "organizations": "/api/v1/organizations",
    "forms": "/api/v1/forms",
    "auth": "/api/v1/firebase-auth"
  }
}
```

### Environment Configuration

The frontend is configured to connect to:
- **API URL**: http://localhost:8080/api/v1
- **Timeout**: 30 seconds
- **Environment**: development
- **Debug Mode**: Enabled

These settings can be modified in `/Users/sebastianlangenberg/Desktop/Hunter-Pace-app-2/.env.local`

### Next Steps

Once both applications are running and connected:
1. Test the authentication pages (Login/Signup)
2. Verify API endpoints work correctly
3. Test form validation and error handling
4. Check that all UI components render properly

### Ports Used

- **Backend (RideRelease)**: http://localhost:8080
- **Frontend (PaceMaster)**: http://localhost:3000

Make sure these ports are available before starting the applications.