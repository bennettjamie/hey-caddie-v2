/**
 * Firebase Authentication utilities
 */

import { signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

export async function signInAnonymouslyUser() {
    if (!auth) throw new Error('Auth not initialized');
    return signInAnonymously(auth);
}

export async function signInWithEmail(email: string, password: string) {
    if (!auth) throw new Error('Auth not initialized');
    return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
    if (!auth) throw new Error('Auth not initialized');
    return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
    if (!auth) throw new Error('Auth not initialized');
    return signOut(auth);
}

export function getCurrentUser(): User | null {
    if (!auth) return null;
    return auth.currentUser;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
}

export function isAuthInitialized(): boolean {
    return auth !== null;
}

