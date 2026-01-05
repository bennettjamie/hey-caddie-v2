import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Safety check to prevent crashes if env vars are missing
const isFirebaseConfigured = typeof window !== 'undefined' ?
    !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY :
    true; // Assume server-side is fine or handled elsewhere, but for client we need this check

if (!isFirebaseConfigured && typeof window !== 'undefined') {
    console.warn('Firebase configuration is missing! Check your .env.local file or Vercel Environment Variables.');
}

let app;
let db: any;
let auth: any;

try {
    if (!getApps().length) {
        if (isFirebaseConfigured || typeof window === 'undefined') {
            app = initializeApp(firebaseConfig);
        }
    } else {
        app = getApps()[0];
    }

    if (app) {
        db = getFirestore(app);
        auth = getAuth(app);

        // Enable offline persistence
        if (typeof window !== 'undefined') {
            enableIndexedDbPersistence(db).catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                } else if (err.code == 'unimplemented') {
                    console.log('The current browser does not support all of the features required to enable persistence');
                }
            });
        }
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

export { db, auth, isFirebaseConfigured };






