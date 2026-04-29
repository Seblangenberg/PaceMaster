'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  reload,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  TwitterAuthProvider,
  FacebookAuthProvider,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AuthState, UserProfile, LoginCredentials, SignUpCredentials } from '@/lib/types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => Promise<void>;
  
  // Password reset
  sendPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
  
  // Email verification
  sendEmailVerification: () => Promise<void>;
  reloadUser: () => Promise<void>;
  
  // Social login
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  
  // Password change for authenticated users
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  // Session management
  getAuthToken: () => Promise<string | null>;
  refreshAuthToken: () => Promise<string | null>;
  
  // Account management
  deleteAccount: (password: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Helper function to convert Firebase user to UserProfile
  const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<UserProfile> => {
    // Try to get additional user data from Firestore
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || userData.displayName || 'Organizer',
        role: userData.role || 'user',
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        emailVerified: firebaseUser.emailVerified ?? false,
      };
    } else {
      // Create basic user profile if none exists in Firestore
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Organizer',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: firebaseUser.emailVerified ?? false,
      };
    }
  };

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Firebase auth state changed:', firebaseUser ? 'User signed in' : 'User signed out');
      
      if (firebaseUser) {
        try {
          console.log('Converting Firebase user to UserProfile...');
          const userProfile = await convertFirebaseUser(firebaseUser);
          console.log('User profile created:', userProfile);
          setAuthState({
            user: userProfile,
            isLoading: false,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error('Error converting Firebase user:', error);
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } else {
        // Single-user / no-login mode: silently sign in as anonymous so the
        // existing Firestore rules (which require request.auth != null) still
        // apply, and the app skips the AuthPage. The next onAuthStateChanged
        // tick will pick up the anon user.
        if (process.env.NEXT_PUBLIC_SINGLE_USER === 'true') {
          try {
            await signInAnonymously(auth);
            return;
          } catch (err) {
            console.error('Anonymous sign-in failed:', err);
          }
        }

        console.log('No Firebase user, setting unauthenticated state');
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Sign in with Firebase Auth
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      
      // Auth state will be updated automatically by the onAuthStateChanged listener
      
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Convert Firebase auth errors to user-friendly messages
      let errorMessage = 'Login failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      }
      
      throw new Error(errorMessage);
    }
  };

  const signUp = async (credentials: SignUpCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      const firebaseUser = userCredential.user;
      const displayName = `${credentials.firstName} ${credentials.lastName}`;
      
      // Update Firebase user profile
      await updateProfile(firebaseUser, {
        displayName: displayName
      });
      
      // Create user document in Firestore
      const userProfile: Omit<UserProfile, 'id'> = {
        email: credentials.email,
        displayName: displayName,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: firebaseUser.emailVerified ?? false,
        phoneNumber: credentials.phone,
        organization: credentials.organizationName,
        bio: `${credentials.firstName} ${credentials.lastName} from ${credentials.organizationName || 'Hunter Pace Event'}`,
        preferences: {
          notifications: true,
          emailUpdates: credentials.marketing,
          theme: 'auto'
        }
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      
      // Auth state will be updated automatically by the onAuthStateChanged listener
      
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Log the full error for debugging
      console.error('Sign up error details:', error);
      
      // Convert Firebase auth errors to user-friendly messages
      let errorMessage = 'Account creation failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/configuration-not-found' || error.code === 'auth/invalid-api-key') {
        errorMessage = 'Firebase configuration error. Please check your environment variables.';
      } else if (error.message && error.message.includes('Firebase')) {
        errorMessage = `Firebase error: ${error.message}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Auth state will be updated automatically by the onAuthStateChanged listener
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Password reset functions
  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`, // Return to login after reset
        handleCodeInApp: false,
      });
    } catch (error: any) {
      let errorMessage = 'Failed to send password reset email';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      }
      throw new Error(errorMessage);
    }
  };

  const confirmPasswordResetFn = async (code: string, newPassword: string): Promise<void> => {
    try {
      await confirmPasswordReset(auth, code, newPassword);
    } catch (error: any) {
      let errorMessage = 'Failed to reset password';
      if (error.code === 'auth/expired-action-code') {
        errorMessage = 'Reset code has expired. Please request a new one';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'Invalid reset code. Please check the code and try again';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password';
      }
      throw new Error(errorMessage);
    }
  };

  // Email verification functions
  const sendEmailVerificationFn = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
    } catch (error: any) {
      let errorMessage = 'Failed to send verification email';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      }
      throw new Error(errorMessage);
    }
  };

  const reloadUser = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    try {
      await reload(user);
      // Update auth state with refreshed user data
      const userProfile = await convertFirebaseUser(user);
      setAuthState(prev => ({
        ...prev,
        user: userProfile,
      }));
    } catch (error) {
      console.error('Failed to reload user:', error);
      throw new Error('Failed to refresh user information');
    }
  };

  // Social login functions
  const signInWithGoogle = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create or update user profile in Firestore
      const userProfile = {
        displayName: user.displayName || `${user.email?.split('@')[0]}`,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        photoURL: user.photoURL,
        provider: 'google',
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });
      
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      let errorMessage = 'Google sign-in failed';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked. Please allow popups and try again';
      }
      
      throw new Error(errorMessage);
    }
  };

  const signInWithFacebook = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create or update user profile in Firestore
      const userProfile = {
        displayName: user.displayName || `${user.email?.split('@')[0]}`,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        photoURL: user.photoURL,
        provider: 'facebook',
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });
      
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      let errorMessage = 'Facebook sign-in failed';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked. Please allow popups and try again';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method';
      }
      
      throw new Error(errorMessage);
    }
  };

  const signInWithTwitter = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const provider = new TwitterAuthProvider();
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create or update user profile in Firestore
      const userProfile = {
        displayName: user.displayName || `${user.email?.split('@')[0] || 'twitter_user'}`,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        photoURL: user.photoURL,
        provider: 'twitter',
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });
      
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      let errorMessage = 'Twitter sign-in failed';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked. Please allow popups and try again';
      }
      
      throw new Error(errorMessage);
    }
  };

  // Password change for authenticated users
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user is currently signed in');
    }

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
    } catch (error: any) {
      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      }
      throw new Error(errorMessage);
    }
  };

  // Session management
  const getAuthToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  };

  const refreshAuthToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken(true); // Force refresh
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      return null;
    }
  };

  // Account management
  const deleteAccount = async (password: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No user is currently signed in');
    }

    try {
      // Re-authenticate before deletion
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      // Delete user data from Firestore first
      await setDoc(doc(db, 'users', user.uid), { deleted: true, deletedAt: new Date() }, { merge: true });
      
      // Delete the Firebase Auth account
      await user.delete();
      
    } catch (error: any) {
      let errorMessage = 'Failed to delete account';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Password is incorrect';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign in again to delete your account';
      }
      throw new Error(errorMessage);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    try {
      // Update Firebase Auth profile if displayName is being updated
      if (updates.displayName) {
        await updateProfile(user, {
          displayName: updates.displayName,
          photoURL: updates.photoURL || user.photoURL,
        });
      }

      // Update Firestore user document
      const userUpdates = {
        ...updates,
        updatedAt: new Date(),
      };
      
      await setDoc(doc(db, 'users', user.uid), userUpdates, { merge: true });
      
      // Update local auth state
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...updates, updatedAt: new Date() } : null,
      }));
      
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw new Error('Failed to update profile');
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    signUp,
    logout,
    
    // Password reset
    sendPasswordReset,
    confirmPasswordReset: confirmPasswordResetFn,
    
    // Email verification
    sendEmailVerification: sendEmailVerificationFn,
    reloadUser,
    
    // Social login
    signInWithGoogle,
    signInWithFacebook,
    signInWithTwitter,
    
    // Password change
    changePassword,
    
    // Session management
    getAuthToken,
    refreshAuthToken,
    
    // Account management
    deleteAccount,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}