import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import express from 'express';
import multer from 'multer';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

// Express app for HTTP functions
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to verify Firebase Auth token
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user profile
app.get('/api/user/profile', authenticateUser, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(userDoc.data());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateUser, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const userData = req.body;
    
    await db.collection('users').doc(userId).set({
      ...userData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get events (public)
app.get('/api/events', async (req: any, res: any) => {
  try {
    const { limit = 20, offset = 0, organizerId } = req.query;
    
    let query = db.collection('events').orderBy('date', 'desc');
    
    if (organizerId) {
      query = query.where('organizerId', '==', organizerId);
    }
    
    const snapshot = await query.limit(Number(limit)).offset(Number(offset)).get();
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event (public)
app.get('/api/events/:eventId', async (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const eventDoc = await db.collection('events').doc(eventId).get();
    
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      id: eventDoc.id,
      ...eventDoc.data()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create/Update event (authenticated)
app.post('/api/events', authenticateUser, async (req: any, res: any) => {
  try {
    const userId = req.user.uid;
    const eventData = req.body;
    
    const eventRef = eventData.id ? 
      db.collection('events').doc(eventData.id) : 
      db.collection('events').doc();
    
    await eventRef.set({
      ...eventData,
      organizerId: userId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: eventData.id ? undefined : admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    res.json({ 
      id: eventRef.id,
      message: 'Event saved successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save event' });
  }
});

// Delete event (authenticated, organizer only)
app.delete('/api/events/:eventId', authenticateUser, async (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.uid;
    
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (eventDoc.data()?.organizerId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }
    
    // Delete subcollections
    const batch = db.batch();
    
    // Delete divisions
    const divisionsSnapshot = await db.collection('events').doc(eventId).collection('divisions').get();
    divisionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete teams
    const teamsSnapshot = await db.collection('events').doc(eventId).collection('teams').get();
    teamsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete results
    const resultsSnapshot = await db.collection('events').doc(eventId).collection('results').get();
    resultsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete main event document
    batch.delete(db.collection('events').doc(eventId));
    
    await batch.commit();
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get event divisions
app.get('/api/events/:eventId/divisions', async (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const snapshot = await db.collection('events').doc(eventId).collection('divisions').get();
    
    const divisions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(divisions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

// Get event teams
app.get('/api/events/:eventId/teams', async (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const snapshot = await db.collection('events').doc(eventId).collection('teams').get();
    
    const teams = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get event results
app.get('/api/events/:eventId/results', async (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const { divisionId } = req.query;
    
    let query: any = db.collection('events').doc(eventId).collection('results');
    
    if (divisionId) {
      query = query.where('divisionId', '==', divisionId);
    }
    
    const snapshot = await query.orderBy('totalTime', 'asc').get();
    
    const results = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Export results to CSV
app.get('/api/events/:eventId/export', async (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const { format = 'csv' } = req.query;
    
    if (format !== 'csv') {
      return res.status(400).json({ error: 'Only CSV export is supported' });
    }
    
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventData = eventDoc.data();
    const resultsSnapshot = await db.collection('events').doc(eventId).collection('results').get();
    const results = resultsSnapshot.docs.map((doc: any) => doc.data());
    
    // Generate CSV content
    const csvHeaders = ['Team', 'Division', 'Start Time', 'Finish Time', 'Total Time', 'Penalties', 'Notes'];
    const csvRows = results.map((result: any) => [
      result.teamName || '',
      result.divisionName || '',
      result.startTime || '',
      result.finishTime || '',
      result.totalTime || '',
      result.penalties || 0,
      result.notes || ''
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
      .map((row: any) => row.map((field: any) => `"${field}"`).join(','))
      .join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${eventData?.name || 'results'}.csv"`);
    res.send(csvContent);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to export results' });
  }
});

// File upload endpoint
app.post('/api/upload/:type/:id', authenticateUser, upload.single('file'), async (req: any, res: any) => {
  try {
    const { type, id } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const bucket = storage.bucket();
    const fileName = `${type}/${id}/${Date.now()}_${file.originalname}`;
    const fileBuffer = file.buffer;
    
    const fileUpload = bucket.file(fileName);
    await fileUpload.save(fileBuffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          uploadedBy: req.user.uid,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    // Make file publicly readable
    await fileUpload.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    res.json({ 
      url: publicUrl,
      fileName: file.originalname,
      size: file.size
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// HTTP function for the Express app
export const api = functions.https.onRequest(app);

// Background functions
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'user'
    });
  } catch (error) {
    console.error('Error creating user document:', error);
  }
});

export const onEventDeleted = functions.firestore
  .document('events/{eventId}')
  .onDelete(async (snap, context) => {
    try {
      const eventId = context.params.eventId;
      
      // Clean up related data in other collections
      const batch = db.batch();
      
      // Delete from leaderboards
      const leaderboardDoc = await db.collection('leaderboards').doc(eventId).get();
      if (leaderboardDoc.exists) {
        batch.delete(leaderboardDoc.ref);
      }
      
      await batch.commit();
    } catch (error) {
      console.error('Error cleaning up deleted event:', error);
    }
  });

// Scheduled function to clean up old events (runs daily at 2 AM)
export const cleanupOldEvents = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const snapshot = await db.collection('events')
        .where('date', '<', oneYearAgo)
        .get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Cleaned up ${snapshot.docs.length} old events`);
    } catch (error) {
      console.error('Error cleaning up old events:', error);
    }
  });

