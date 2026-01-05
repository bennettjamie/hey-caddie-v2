/**
 * Import scraped courses to Firebase
 * Usage: npx ts-node --esm scripts/importScraped.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local manually to avoid 'dotenv' dependency issues
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    const lines = envConfig.split('\n');
    for (const line of lines) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    }
}

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
import { getAuth, signInAnonymously } from 'firebase/auth';
const auth = getAuth(app);

async function importScraped() {
    try {
        console.log('Authenticating...');
        await signInAnonymously(auth);
        console.log('Authed!');
    } catch (e) {
        console.error('Auth failed:', e);
        return;
    }

    const jsonPath = path.join(process.cwd(), 'data', 'scraped-courses.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('No scraped courses found at', jsonPath);
        return;
    }

    const courses = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`Found ${courses.length} courses to import...`);

    for (const courseData of courses) {
        try {
            console.log(`Importing ${courseData.name}...`);

            // Manual transformation to ensure standalone execution
            const transformed = {
                name: courseData.name,
                location: courseData.city ? `${courseData.city}, ${courseData.state || ''}` : courseData.address || '',
                city: courseData.city,
                state: courseData.state,
                lat: courseData.latitude,
                lng: courseData.longitude,
                description: courseData.description,
                dgcoursereviewId: courseData.id,
                dgcoursereviewUrl: `https://www.dgcoursereview.com/course.php?id=${courseData.id}`,
                layouts: {
                    default: {
                        name: 'Main',
                        holes: {},
                        parTotal: 54
                    }
                },
                createdAt: new Date().toISOString()
            };

            // Populate 18 holes
            for (let i = 1; i <= 18; i++) {
                (transformed.layouts.default.holes as any)[i] = { par: 3 };
            }

            // Use a deterministic ID if we want, or random
            const newRef = doc(collection(db, 'courses'));
            await setDoc(newRef, transformed);
            console.log(`✅ Imported ${courseData.name} as ${newRef.id}`);

        } catch (error: any) {
            console.error(`❌ Failed to import ${courseData.name}:`, error.message);
        }
    }

    console.log('Done!');
    process.exit(0);
}

importScraped().catch(console.error);
