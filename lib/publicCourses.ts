import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    getDoc,
    serverTimestamp,
    limit,
    startAfter,
    OrderByDirection,
    orderBy
} from 'firebase/firestore';
import { db, getFirebaseAuth } from './firebase';
import { Course, CourseLayout } from '@/types/firestore';

// Helper to get auth instance
const getAuth = () => getFirebaseAuth();

export interface PublicCourseSummary {
    id: string;
    name: string;
    location: string;
    rating: number;
    layoutCount: number;
}

const PUBLIC_COURSES_COLLECTION = 'public_courses';
const USERS_COLLECTION = 'users'; // Assuming courses are subcollection of users or separate

// Search for public courses
export const searchPublicCourses = async (searchTerm: string): Promise<PublicCourseSummary[]> => {
    // Note: Firestore full-text search is limited. 
    // For a real production app, we'd use Algolia or Typesense.
    // Here we will implement a simple prefix search on the 'name' field if possible,
    // or just fetch recent public courses if query is empty.

    // In a real scenario, we might also duplicate 'name' to 'name_lower' for case-insensitive search.

    let q;

    if (!searchTerm) {
        // Just get top rated or recent
        q = query(
            collection(db, PUBLIC_COURSES_COLLECTION),
            where('isPublic', '==', true),
            orderBy('rating', 'desc'),
            limit(20)
        );
    } else {
        // Very basic prefix match (case-sensitive unfortunately in standard firestore)
        // Ideally we rely on a specialized search index. 
        // For this prototype, we'll fetch a batch and filter client-side or use '>=' trick
        q = query(
            collection(db, PUBLIC_COURSES_COLLECTION),
            where('isPublic', '==', true),
            where('name', '>=', searchTerm),
            where('name', '<=', searchTerm + '\uf8ff'),
            limit(20)
        );
    }

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as Course;
            return {
                id: doc.id,
                name: data.name,
                location: `${data.city || ''}, ${data.state || ''}`.replace(/^, /, ''),
                rating: data.rating || 0,
                layoutCount: Object.keys(data.layouts || {}).length
            };
        });
    } catch (error) {
        console.error("Error searching public courses:", error);
        return [];
    }
};

// Fork a public course to the user's local library
export const forkCourseToLocal = async (publicCourseId: string): Promise<string> => {
    const auth = getAuth();
    if (!auth?.currentUser) throw new Error("User must be logged in to fork a course");

    // 1. Fetch the public course
    const courseRef = doc(db, PUBLIC_COURSES_COLLECTION, publicCourseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
        throw new Error("Public course not found");
    }

    const publicData = courseSnap.data() as Course;

    // 2. Prepare the new local course object
    // We strip the ID and metadata that ties it to the public entry (except maybe a source ref)
    const newCourseData: Partial<Course> = {
        name: publicData.name,
        location: publicData.location,
        city: publicData.city,
        state: publicData.state,
        country: publicData.country,
        lat: publicData.lat,
        lng: publicData.lng,
        address: publicData.address,
        website: publicData.website,
        description: publicData.description,
        courseType: publicData.courseType,
        terrain: publicData.terrain,
        // Keep the layouts
        layouts: publicData.layouts,
        // Initialize other fields
        images: publicData.images || [],
        amenities: publicData.amenities || [],
        // User specific
        isPublic: false, // It's now a private copy
        source: 'dgcoursereview-import', // or generic 'fork'
        dgcoursereviewId: publicData.dgcoursereviewId, // Keep reference if it exists
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // 3. Add to user's personal 'courses' subcollection
    const userCoursesRef = collection(db, USERS_COLLECTION, auth.currentUser.uid, 'courses');
    const docRef = await addDoc(userCoursesRef, newCourseData);

    return docRef.id;
};
