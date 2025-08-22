import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  UserCredential
} from 'firebase/auth';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, auth, storage, functions } from '@/lib/firebase';
import type { EventDetails, Division, Team, SavedEvent, UserProfile } from '@/lib/types';

// Authentication Services
export const authService = {
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  },

  // Create new user account
  async signUp(email: string, password: string, displayName: string): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential;
  },

  // Sign out
  async signOut(): Promise<void> {
    return signOut(auth);
  },

  // Reset password
  async resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(auth, email);
  },

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return auth.onAuthStateChanged(callback);
  }
};

// User Profile Services
export const userService = {
  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...profileData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Create user profile
  async createUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...profileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
};

// Event Services
export const eventService = {
  // Get all events with pagination
  async getEvents(limitCount: number = 20, lastDoc?: QueryDocumentSnapshot<DocumentData>) {
    try {
      let q = query(
        collection(db, 'events'),
        orderBy('date', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedEvent[];

      return {
        events,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  // Get events by organizer
  async getEventsByOrganizer(organizerId: string, limitCount: number = 20) {
    try {
      const q = query(
        collection(db, 'events'),
        where('organizerId', '==', organizerId),
        orderBy('lastModified', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedEvent[];
    } catch (error) {
      console.error('Error fetching organizer events:', error);
      throw error;
    }
  },

  // Get single event
  async getEvent(eventId: string): Promise<SavedEvent | null> {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        return { id: eventDoc.id, ...eventDoc.data() } as SavedEvent;
      }
      return null;
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  },

  // Create new event
  async createEvent(eventData: Omit<SavedEvent, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'events'), {
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // Update event
  async updateEvent(eventId: string, eventData: Partial<SavedEvent>): Promise<void> {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        ...eventData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  // Delete event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      // Delete divisions
      const divisionsSnapshot = await getDocs(collection(db, 'events', eventId, 'divisions'));
      divisionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete teams
      const teamsSnapshot = await getDocs(collection(db, 'events', eventId, 'teams'));
      teamsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete results
      const resultsSnapshot = await getDocs(collection(db, 'events', eventId, 'results'));
      resultsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete main event
      batch.delete(doc(db, 'events', eventId));
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
};

// Division Services
export const divisionService = {
  // Get divisions for an event
  async getEventDivisions(eventId: string): Promise<Division[]> {
    try {
      const snapshot = await getDocs(collection(db, 'events', eventId, 'divisions'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Division[];
    } catch (error) {
      console.error('Error fetching divisions:', error);
      throw error;
    }
  },

  // Add division to event
  async addDivision(eventId: string, division: Omit<Division, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'events', eventId, 'divisions'), division);
      return docRef.id;
    } catch (error) {
      console.error('Error adding division:', error);
      throw error;
    }
  },

  // Update division
  async updateDivision(eventId: string, divisionId: string, divisionData: Partial<Division>): Promise<void> {
    try {
      await updateDoc(doc(db, 'events', eventId, 'divisions', divisionId), divisionData);
    } catch (error) {
      console.error('Error updating division:', error);
      throw error;
    }
  },

  // Delete division
  async deleteDivision(eventId: string, divisionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'events', eventId, 'divisions', divisionId));
    } catch (error) {
      console.error('Error deleting division:', error);
      throw error;
    }
  }
};

// Team Services
export const teamService = {
  // Get teams for an event
  async getEventTeams(eventId: string): Promise<Team[]> {
    try {
      const snapshot = await getDocs(collection(db, 'events', eventId, 'teams'));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
    } catch (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  },

  // Add team to event
  async addTeam(eventId: string, team: Omit<Team, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'events', eventId, 'teams'), team);
      return docRef.id;
    } catch (error) {
      console.error('Error adding team:', error);
      throw error;
    }
  },

  // Update team
  async updateTeam(eventId: string, teamId: string, teamData: Partial<Team>): Promise<void> {
    try {
      await updateDoc(doc(db, 'events', eventId, 'teams', teamId), teamData);
    } catch (error) {
      console.error('Error updating team:', error);
      throw error;
    }
  },

  // Delete team
  async deleteTeam(eventId: string, teamId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'events', eventId, 'teams', teamId));
    } catch (error) {
      console.error('Error deleting team:', error);
      throw error;
    }
  }
};

// Storage Services
export const storageService = {
  // Upload file
  async uploadFile(path: string, file: File): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // Delete file
  async deleteFile(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  // Get file URL
  async getFileURL(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw error;
    }
  }
};

// Functions Services
export const functionsService = {
  // Export results to CSV
  async exportResults(eventId: string, format: string = 'csv'): Promise<Blob> {
    try {
      const exportFunction = httpsCallable(functions, 'exportResults');
      const result = await exportFunction({ eventId, format });
      return result.data as Blob;
    } catch (error) {
      console.error('Error exporting results:', error);
      throw error;
    }
  },

  // Process event results
  async processEventResults(eventId: string): Promise<void> {
    try {
      const processFunction = httpsCallable(functions, 'processEventResults');
      await processFunction({ eventId });
    } catch (error) {
      console.error('Error processing results:', error);
      throw error;
    }
  }
};

// Utility function to convert Firestore timestamp to Date
export const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
};

// Utility function to convert Date to Firestore timestamp
export const convertToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

