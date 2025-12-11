/**
 * Test Firebase connection
 * Run this in browser console or call from a component
 */

import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

export async function testFirebaseConnection() {
    try {
        console.log('🧪 Testing Firebase connection...');
        
        // Test write
        const testRef = await addDoc(collection(db, 'test'), {
            message: 'Firebase connection test',
            timestamp: new Date().toISOString()
        });
        console.log('✅ Write test passed:', testRef.id);
        
        // Test read
        const snapshot = await getDocs(collection(db, 'test'));
        console.log('✅ Read test passed:', snapshot.size, 'documents found');
        
        // Clean up test document
        await deleteDoc(doc(db, 'test', testRef.id));
        console.log('✅ Cleanup successful');
        
        return { success: true, message: 'Firebase connection successful!' };
    } catch (error: any) {
        console.error('❌ Firebase test failed:', error);
        return { 
            success: false, 
            message: `Firebase connection failed: ${error.message}`,
            error 
        };
    }
}

// Test Firestore rules
export async function testFirestoreRules() {
    try {
        // Try to read courses (should work for all)
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        console.log('✅ Courses read test passed:', coursesSnapshot.size, 'courses');
        
        return { success: true, message: 'Firestore rules test passed!' };
    } catch (error: any) {
        console.error('❌ Firestore rules test failed:', error);
        return { 
            success: false, 
            message: `Firestore rules test failed: ${error.message}`,
            error 
        };
    }
}

