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

// Loader preferring environment variables to keep keys secure, or falling back to the JSON configuration
const getFirebaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  const envConfig = {
    projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
    appId: metaEnv.VITE_FIREBASE_APP_ID,
    apiKey: metaEnv.VITE_FIREBASE_API_KEY,
    authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
    firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID,
    storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID,
  };

  if (envConfig.apiKey && envConfig.apiKey !== 'placeholder-api-key') {
    return envConfig;
  }
  return firebaseConfig;
};

const activeConfig = getFirebaseConfig();
const isRealFirebase = activeConfig && activeConfig.apiKey && activeConfig.apiKey !== 'regular-placeholder' && activeConfig.apiKey !== 'placeholder-api-key' && activeConfig.apiKey !== '';

let auth: any = null;

if (isRealFirebase) {
  try {
    const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
    auth = getAuth(app);
    console.log('Firebase Auth initialized successfully via secure config.');
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
      // Create a gorgeous and interactive dynamic DOM modal simulating the Google Sign-In Select Account window!
      return new Promise<UserSession>((resolve, reject) => {
        // Create full overlay
        const overlay = document.createElement('div');
        overlay.id = 'simulated-google-auth-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-sans';
        
        const modal = document.createElement('div');
        modal.className = 'bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-200 text-left';
        
        modal.innerHTML = `
          <div class="flex flex-col items-center text-center pb-5 mb-5 border-b border-slate-100 dark:border-slate-800">
            <svg class="w-10 h-10 mb-3" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.12-3.12C17.43 1.68 14.9 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.81 2.96c.9-2.7 3.42-4.42 6.69-4.42z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.45c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.38-4.87 3.38-8.5z"/>
              <path fill="#FBBC05" d="M5.31 14.54c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18L1.5 7.22C.54 9.15 0 11.3 0 13.5s.54 4.35 1.5 6.28l3.81-2.96z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.1.74-2.51 1.18-4.3 1.18-3.27 0-5.79-1.72-6.69-4.42l-3.81 2.96C3.39 20.35 7.35 23 12 23z"/>
            </svg>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Choose a Google Account</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">to sign in to <span class="font-extrabold text-indigo-600 dark:text-indigo-400">FairAudit AI</span></p>
          </div>
          
          <div class="space-y-3 mb-5">
            <!-- Option 1: Active User -->
            <button type="button" id="google-active-user-btn" class="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800 transition-all text-left group cursor-pointer">
              <div class="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-600/10">
                O
              </div>
              <div class="flex-grow min-w-0">
                <p class="text-xs font-bold text-slate-800 dark:text-slate-250 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">omp175789@gmail.com</p>
                <p class="text-[9px] text-slate-400 font-extrabold tracking-wide uppercase mt-0.5">Active Dev Member</p>
              </div>
            </button>
            
            <!-- Option 2: Another Custom account -->
            <div id="custom-account-container" class="border border-slate-150 dark:border-slate-800/80 p-3 rounded-2xl space-y-2.5 bg-slate-50/50 dark:bg-slate-900/30">
              <div class="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-0.5">Use another Google account:</div>
              <input type="email" id="google-custom-email" placeholder="Enter google email address..." class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 focus:border-indigo-500 rounded-xl outline-none text-slate-850 dark:text-white font-bold transition-all" />
              <input type="text" id="google-custom-name" placeholder="Enter full name..." class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 focus:border-indigo-500 rounded-xl outline-none text-slate-850 dark:text-white font-semibold transition-all" />
              <button type="button" id="google-custom-submit" class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer mt-1">
                Authenticate with Account
              </button>
            </div>
          </div>
          
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="google-cancel-btn" class="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Listeners
        const activeUserBtn = document.getElementById('google-active-user-btn');
        const customEmailInput = document.getElementById('google-custom-email') as HTMLInputElement;
        const customNameInput = document.getElementById('google-custom-name') as HTMLInputElement;
        const customSubmitBtn = document.getElementById('google-custom-submit');
        const cancelBtn = document.getElementById('google-cancel-btn');
        
        const cleanup = () => {
          if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
        };
        
        activeUserBtn?.addEventListener('click', () => {
          const session: UserSession = {
            uid: 'google_local_omp175789',
            email: 'omp175789@gmail.com',
            displayName: 'Google Dev Member',
            photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop',
            isGoogle: true
          };
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
          cleanup();
          resolve(session);
        });
        
        customSubmitBtn?.addEventListener('click', () => {
          const email = customEmailInput?.value?.trim() || '';
          const name = customNameInput?.value?.trim() || '';
          
          if (!email || !email.includes('@')) {
            alert('Please enter a valid Google email address.');
            return;
          }
          
          const displayName = name || email.split('@')[0];
          const uid = 'google_local_' + Math.random().toString(36).substring(2, 11);
          
          const session: UserSession = {
            uid,
            email,
            displayName,
            isGoogle: true
          };
          localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
          cleanup();
          resolve(session);
        });
        
        cancelBtn?.addEventListener('click', () => {
          cleanup();
          reject(new Error('Google Account selection cancelled.'));
        });
      });
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
