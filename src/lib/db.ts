import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
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

let db: any = null;

if (isRealFirebase) {
  try {
    const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
    db = getFirestore(app);
    console.log('Firebase Firestore initialized successfully via secure config.');
  } catch (err) {
    console.warn('Firebase failed to initialize, using localStorage fallback:', err);
  }
} else {
  console.log('Using robust LocalStorage simulation for FairAudit AI database operations.');
}

// Interfaces
export interface TimelineEntry {
  id: string;
  projectName: string;
  date: string; // "June 1", "June 14", etc.
  timestamp: number;
  biasScore: number;
  module: string;
}

export interface SharedReport {
  id: string; // 6-character alphanumeric ID
  timestamp: string;
  module: string;
  biasScore: number;
  findings: any; // full audit report JSON
}

// Helpers
function generate6CharId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const DbService = {
  // TIMELINE TRACKER
  async saveTimelineEntry(projectName: string, biasScore: number, moduleName: string): Promise<TimelineEntry> {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}`;
    const timestamp = now.getTime();
    
    const entryData: Omit<TimelineEntry, 'id'> = {
      projectName,
      date: dateStr,
      timestamp,
      biasScore,
      module: moduleName
    };

    // Save to Firestore if available
    let savedId = '';
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'timeline'), entryData);
        savedId = docRef.id;
      } catch (err) {
        console.warn('Firestore write failed, falling back to local storage:', err);
      }
    }

    // Always mirror to LocalStorage
    if (!savedId) {
      savedId = 'local_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    
    const fullEntry: TimelineEntry = { id: savedId, ...entryData };
    const existing = this.getTimelineHistoryFromLocal();
    existing.push(fullEntry);
    localStorage.setItem('fairaudit_timeline', JSON.stringify(existing));

    return fullEntry;
  },

  getTimelineHistoryFromLocal(): TimelineEntry[] {
    const raw = localStorage.getItem('fairaudit_timeline');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async getTimelineForProject(projectName: string): Promise<TimelineEntry[]> {
    if (db) {
      try {
        const q = query(collection(db, 'timeline'), orderBy('timestamp', 'asc'));
        const querySnapshot = await getDocs(q);
        const entries: TimelineEntry[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.projectName === projectName) {
            entries.push({ id: doc.id, ...data } as TimelineEntry);
          }
        });
        if (entries.length > 0) {
          return entries;
        }
      } catch (err) {
        console.warn('Firestore fetch failed, querying local storage:', err);
      }
    }

    // Local filter
    const local = this.getTimelineHistoryFromLocal();
    return local
      .filter(item => item.projectName.toLowerCase().trim() === projectName.toLowerCase().trim())
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  async getAllProjectsTimeline(): Promise<Record<string, TimelineEntry[]>> {
    let allEntries: TimelineEntry[] = [];
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'timeline'));
        querySnapshot.forEach((doc) => {
          allEntries.push({ id: doc.id, ...doc.data() } as TimelineEntry);
        });
      } catch (err) {
        console.warn('Firestore fetch failed for all projects timeline:', err);
        allEntries = this.getTimelineHistoryFromLocal();
      }
    } else {
      allEntries = this.getTimelineHistoryFromLocal();
    }

    // Group by project name
    const grouped: Record<string, TimelineEntry[]> = {};
    allEntries.forEach(entry => {
      const key = entry.projectName.trim();
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });

    // Sort each group by timestamp
    for (const key in grouped) {
      grouped[key].sort((a, b) => a.timestamp - b.timestamp);
    }

    return grouped;
  },

  // SHAREABLE REPORTS
  async saveSharedReport(moduleName: string, biasScore: number, findings: any): Promise<string> {
    const reportId = generate6CharId();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const reportData: SharedReport = {
      id: reportId,
      timestamp: dateStr,
      module: moduleName,
      biasScore,
      findings
    };

    if (db) {
      try {
        await setDoc(doc(db, 'shared_reports', reportId), {
          ...reportData,
          findings: JSON.stringify(findings) // Store stringified structure or map
        });
      } catch (err) {
        console.warn('Firestore shared report write failed, falling back to local storage:', err);
      }
    }

    // Mirror to LocalStorage
    const reports = this.getLocalSharedReports();
    reports[reportId] = reportData;
    localStorage.setItem('fairaudit_shared_reports', JSON.stringify(reports));

    return reportId;
  },

  getLocalSharedReports(): Record<string, SharedReport> {
    const raw = localStorage.getItem('fairaudit_shared_reports');
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  async getSharedReport(reportId: string): Promise<SharedReport | null> {
    if (db) {
      try {
        const docSnap = await getDoc(doc(db, 'shared_reports', reportId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            id: data.id,
            timestamp: data.timestamp,
            module: data.module,
            biasScore: data.biasScore,
            findings: typeof data.findings === 'string' ? JSON.parse(data.findings) : data.findings
          } as SharedReport;
        }
      } catch (err) {
        console.warn('Firestore shared report get failed, loading from local storage:', err);
      }
    }

    // Fallback to local storage
    const reports = this.getLocalSharedReports();
    return reports[reportId] || null;
  },

  // Encode report data into a secure, portable, and shareable URL query format
  buildShareLink(reportId: string, moduleName: string, biasScore: number, findings: any): string {
    const reportData = {
      id: reportId,
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      module: moduleName,
      biasScore,
      findings
    };
    try {
      const jsonStr = JSON.stringify(reportData);
      const utf8Str = unescape(encodeURIComponent(jsonStr));
      const base64 = btoa(utf8Str);
      const encoded = encodeURIComponent(base64);
      return `${window.location.origin}${window.location.pathname}?report=${reportId}&dt=${encoded}`;
    } catch (err) {
      console.error('Failed to encode report data for link:', err);
      return `${window.location.origin}${window.location.pathname}?report=${reportId}`;
    }
  },

  // Decode a portable shared report payload directly from url-encoded query parameters
  decodeReportFromUrl(encoded: string): SharedReport | null {
    try {
      const base64 = decodeURIComponent(encoded);
      const utf8Str = atob(base64);
      const jsonStr = decodeURIComponent(escape(utf8Str));
      return JSON.parse(jsonStr) as SharedReport;
    } catch (err) {
      console.error('Failed to decode report data from URL:', err);
      return null;
    }
  }
};
