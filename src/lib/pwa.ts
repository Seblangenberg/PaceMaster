'use client';

// PWA utilities for service worker registration and offline handling
export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      console.log('Service Worker registered successfully:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, notify user
              console.log('New content available! Please refresh.');
              showUpdateAvailable();
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  
  console.log('Service Worker not supported');
  return null;
};

// Show update notification
const showUpdateAvailable = () => {
  // You can implement a toast notification here
  if (confirm('A new version is available! Would you like to refresh?')) {
    window.location.reload();
  }
};

// Check if app is running in standalone mode (installed PWA)
export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as any).standalone) ||
    document.referrer.includes('android-app://')
  );
};

// Check online status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Listen for online/offline events
export const addConnectionListeners = (
  onOnline: () => void,
  onOffline: () => void
): (() => void) => {
  const handleOnline = () => {
    console.log('App is back online');
    onOnline();
  };
  
  const handleOffline = () => {
    console.log('App is offline');
    onOffline();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};

// Request background sync
export const requestBackgroundSync = (tag: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready
        .then((registration) => {
          // Type assertion for sync API
          return (registration as any).sync.register(tag);
        })
        .then(() => {
          console.log('Background sync registered:', tag);
          resolve();
        })
        .catch((error) => {
          console.error('Background sync registration failed:', error);
          reject(error);
        });
    } else {
      console.log('Background sync not supported');
      reject(new Error('Background sync not supported'));
    }
  });
};

// Install prompt handling
let deferredPrompt: PWAInstallPrompt | null = null;

export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e as any;
    console.log('Install prompt available');
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
  });
};

export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    return false;
  }
  
  try {
    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear the deferredPrompt
    deferredPrompt = null;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('Error showing install prompt:', error);
    return false;
  }
};

export const canInstall = (): boolean => {
  return deferredPrompt !== null;
};
