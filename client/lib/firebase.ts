import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBh3U-f8sUXy-gR-qf7jLA3du0O2uKsngU",
  authDomain: "secteur-25.firebaseapp.com",
  projectId: "secteur-25",
  storageBucket: "secteur-25.firebasestorage.app",
  messagingSenderId: "150863967303",
  appId: "1:150863967303:web:5e75cc0a581e8d1a38ed62"
};

// Debug: Log Firebase config
console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey.substring(0, 10) + '...'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase uses its own networking - don't intercept fetch

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Test Firebase connectivity
export const testFirebaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Testing Firebase connection...');

    // First check if we're online
    if (!navigator.onLine) {
      return { success: false, error: 'Device is offline' };
    }

    // Test Firestore connection using a valid collection name
    const testDoc = doc(db, 'app_config', 'connection_test');

    // Aggressive connection test with shorter timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000); // 5 seconds
    });

    const connectionPromise = getDoc(testDoc);
    await Promise.race([connectionPromise, timeoutPromise]);

    console.log('Firebase connection: SUCCESS');
    return { success: true };
  } catch (error: any) {
    console.error('Firebase connection test failed:', error);

    // Handle specific error cases
    if (error.code === 'permission-denied') {
      // Permission denied means Firebase is reachable but needs setup
      console.error('🚫 FIRESTORE RULES NOT DEPLOYED - This is the most common issue');
      console.error('💡 SOLUTION: Deploy simplified Firestore rules via Firebase Console');
      console.error('📋 Rules needed: Allow all authenticated users read/write access');
      return {
        success: false,
        error: 'URGENT: Firestore rules not deployed. Deploy simplified rules via Firebase Console to fix this error.'
      };
    }

    if (error.code === 'failed-precondition') {
      // Firestore database doesn't exist yet
      console.log('Firestore database not created yet');
      return {
        success: false,
        error: 'Firestore database not created - please initialize database in Firebase Console'
      };
    }

    let errorMessage = 'Connection failed';
    if (error.code) {
      errorMessage = `Firebase error: ${error.code}`;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Connection timeout';
    } else if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      errorMessage = 'CRITICAL: Network failure - Firebase unreachable. Click "Réinitialiser" to force recovery.';
    } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      errorMessage = 'NETWORK ERROR: Complete connectivity failure. Emergency restart required.';
    }

    return { success: false, error: errorMessage };
  }
};

// Connection recovery utility
export const attemptConnectionRecovery = async () => {
  console.log('🔄 Attempting connection recovery...');

  // Test actual Firestore connection
  return await testFirebaseConnection();
};

// Emergency recovery - clear cache and reload
export const emergencyFirebaseRecovery = () => {
  console.log('🚨 Emergency Firebase recovery - clearing cache and reloading...');

  // Clear localStorage
  try {
    localStorage.clear();
  } catch (e) {
    console.log('Could not clear localStorage:', e);
  }

  // Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch (e) {
    console.log('Could not clear sessionStorage:', e);
  }

  // Force reload the page
  window.location.reload();
};

// Nuclear option - aggressive recovery
export const aggressiveFirebaseRecovery = () => {
  console.log('☢️ Aggressive Firebase recovery - nuclear option...');

  return new Promise<void>((resolve) => {
    // Clear all possible storage
    const clearStorage = async () => {
      try {
        // Clear all storage types
        localStorage.clear();
        sessionStorage.clear();

        // Clear IndexedDB
        if ('indexedDB' in window) {
          const dbs = await indexedDB.databases();
          await Promise.all(
            dbs.map(db => {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            })
          );
        }

        // Clear service worker cache
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }

        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        console.log('✅ All storage cleared');
        resolve();
      } catch (error) {
        console.error('Storage clearing failed:', error);
        resolve(); // Continue anyway
      }
    };

    clearStorage().then(() => {
      // Force reload with cache busting
      const url = new URL(window.location.href);
      url.searchParams.set('cache_bust', Date.now().toString());
      url.searchParams.set('force_reload', 'true');
      window.location.href = url.toString();
    });
  });
};

export default app;
