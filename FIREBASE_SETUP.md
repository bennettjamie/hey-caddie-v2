# Firebase Setup Guide

Follow these steps to set up Firebase for the Hey Caddie app.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `hey-caddie-v2` (or your preferred name)
4. Disable Google Analytics (optional, can enable later)
5. Click **"Create project"**

## Step 2: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** ⚙️ → **Project settings**
2. Scroll down to **"Your apps"** section
3. Click the **Web app icon** (`</>`)
4. Register your app:
   - **App nickname**: `Hey Caddie Web`
   - Check **"Also set up Firebase Hosting"** (optional)
   - Click **"Register app"**
5. **Copy the `firebaseConfig` object** - you'll need these values

## Step 3: Create Environment File

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and fill in your Firebase config values:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...your_actual_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

## Step 4: Set Up Firestore Database

1. In Firebase Console, go to **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules next)
4. Select a **location** (choose closest to your users)
5. Click **"Enable"**

## Step 5: Set Up Security Rules

1. In Firestore Database, click on the **"Rules"** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Courses - read for all, write for authenticated users
    match /courses/{courseId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Users - read/write own data only
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Rounds - read own rounds, write own rounds
    match /rounds/{roundId} {
      allow read: if request.auth != null && 
        (resource.data.players[request.auth.uid] != null || 
         request.auth.uid == resource.data.createdBy);
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.resource.data.players[request.auth.uid] != null ||
         request.auth.uid == resource.data.createdBy);
    }
    
    // Players - read for authenticated, write own
    match /players/{playerId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == playerId;
    }
  }
}
```

3. Click **"Publish"**

## Step 6: Enable Authentication

1. In Firebase Console, go to **"Authentication"** in the left menu
2. Click **"Get started"**
3. Enable these sign-in providers:
   - **Email/Password** - Click, enable, save
   - **Google** (optional) - Click, enable, add support email, save
   - **Anonymous** (for quick starts) - Click, enable, save

## Step 7: Create Indexes (Optional but Recommended)

For location-based course queries:

1. Go to **Firestore Database** → **Indexes** tab
2. Click **"Create Index"**
3. Set up:
   - **Collection ID**: `courses`
   - **Fields to index**:
     - `lat` (Ascending)
     - `lng` (Ascending)
   - **Query scope**: Collection
4. Click **"Create"**

## Step 8: Test Your Setup

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open your app in the browser

3. Open browser console (F12) and run:
   ```javascript
   import { testFirebaseConnection } from './lib/testFirebase';
   testFirebaseConnection();
   ```

   Or create a test component/page to call the test function.

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure `.env.local` exists and has all required variables
- Restart your dev server after creating `.env.local`
- Check that variable names start with `NEXT_PUBLIC_`

### "Missing or insufficient permissions"
- Check your Firestore security rules
- Make sure you've published the rules (click "Publish" button)

### "Firebase App named '[DEFAULT]' already exists"
- This is normal if Firebase is already initialized
- The code handles this automatically

## Next Steps

Once Firebase is set up:
1. ✅ Test the connection
2. ✅ Set up web scraping for course data
3. ✅ Import courses from dgcoursereview.com
4. ✅ Test course creation and retrieval

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

