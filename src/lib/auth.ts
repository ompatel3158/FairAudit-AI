import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';

// Detect if config is placeholder or active real config
const isRealFirebase = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'placeholder-api-key';

let auth: any = null;

if (isRealFirebase) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    console.log('Firebase Auth initialized successfully.');
  } catch (err) {
    console.warn('Firebase Auth failed to initialize, using LocalStorage simulation:', err);
  }
}

export interface UserSession {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isGoogle: boolean;
}

// Emulated user storage for fallback mode
const LOCAL_USERS_KEY = 'fairaudit_emulated_users';
const LOCAL_SESSION_KEY = 'fairaudit_user_session';

function getLocalUsers(): Record<string, { email: string; passwordHash: string; displayName: string }> {
  const data = localStorage.getItem(LOCAL_USERS_KEY);
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}

function saveLocalUsers(users: Record<string, { email: string; passwordHash: string; displayName: string }>) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export const AuthService = {
  isConfigured(): boolean {
    return !!auth;
  },

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<UserSession> {
    if (auth) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
        const user = userCredential.user;
        return {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || displayName,
          isGoogle: false
        };
      }
      throw new Error('Sign up failed');
    } else {
      // Robust Local Fallback
      if (password.length < 6) {
        throw new Error('Password should be at least 6 characters');
      }
      const users = getLocalUsers();
      const normalizedEmail = email.toLowerCase().trim();
      if (users[normalizedEmail]) {
        throw new Error('An account with this email already exists.');
      }
      users[normalizedEmail] = {
        email: normalizedEmail,
        passwordHash: btoa(password), // simple base64 hash for simulation
        displayName: displayName || email.split('@')[0]
      };
      saveLocalUsers(users);

      const session: UserSession = {
        uid: 'local_' + Math.random().toString(36).substr(2, 9),
        email: normalizedEmail,
        displayName: displayName,
        isGoogle: false
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
      return session;
    }
  },

  async signInWithEmail(email: string, password: string): Promise<UserSession> {
    if (auth) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        isGoogle: false
      };
    } else {
      // Local Fallback simulation
      const users = getLocalUsers();
      const normalizedEmail = email.toLowerCase().trim();
      const foundUser = users[normalizedEmail];
      if (!foundUser || foundUser.passwordHash !== btoa(password)) {
        throw new Error('Invalid email or password credentials.');
      }
      const session: UserSession = {
        uid: 'local_' + Math.random().toString(36).substr(2, 9),
        email: normalizedEmail,
        displayName: foundUser.displayName,
        isGoogle: false
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
      return session;
    }
  },

  async signInWithGoogle(): Promise<UserSession> {
    if (auth) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Authorized Google User',
        photoURL: user.photoURL || undefined,
        isGoogle: true
      };
    } else {
      // Simulate Google Login Popup interface
      const session: UserSession = {
        uid: 'google_local_' + Math.random().toString(36).substring(2, 11),
        email: 'omp175789@gmail.com', // Pre-fill with active user's metadata for premium feeling!
        displayName: 'Google Dev Member',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop',
        isGoogle: true
      };
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
      return session;
    }
  },

  async signInGuest(): Promise<UserSession> {
    const session: UserSession = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 11),
      email: 'guest@fairaudit.org',
      displayName: 'Guest Auditor',
      isGoogle: false
    };
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async signOut(): Promise<void> {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    if (auth) {
      await signOut(auth);
    }
  },

  // Setup state change listener
  onAuthStateChange(callback: (user: UserSession | null) => void) {
    if (auth) {
      return onAuthStateChanged(auth, (user: FirebaseUser | null) => {
        if (user) {
          callback({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL || undefined,
            isGoogle: !!user.providerData.some(p => p.providerId === 'google.com')
          });
        } else {
          // If a guest/local session exists, fall back to it
          const rawSession = localStorage.getItem(LOCAL_SESSION_KEY);
          if (rawSession) {
            try {
              callback(JSON.parse(rawSession));
              return;
            } catch {
              // ignore and clear
              localStorage.removeItem(LOCAL_SESSION_KEY);
            }
          }
          callback(null);
        }
      });
    } else {
      // Local storage check
      const rawSession = localStorage.getItem(LOCAL_SESSION_KEY);
      if (rawSession) {
        try {
          callback(JSON.parse(rawSession));
        } catch {
          callback(null);
        }
      } else {
        callback(null);
      }
      // Return unregister mock
      return () => {};
    }
  }
};
