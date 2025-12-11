/**
 * Course management utilities
 */

import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Course, CourseLayout } from '@/types/firestore';

export async function getCourse(courseId: string): Promise<Course | null> {
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
            return { id: courseDoc.id, ...courseDoc.data() } as Course;
        }
        return null;
    } catch (error) {
        console.error('Error getting course:', error);
        return null;
    }
}

export async function getAllCourses(): Promise<Course[]> {
    try {
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        return coursesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        })) as Course[];
    } catch (error) {
        console.error('Error getting courses:', error);
        return [];
    }
}

export async function searchCourses(searchTerm: string): Promise<Course[]> {
    try {
        const courses = await getAllCourses();
        const lowerSearch = searchTerm.toLowerCase();
        return courses.filter(
            (course) =>
                course.name.toLowerCase().includes(lowerSearch) ||
                course.location?.toLowerCase().includes(lowerSearch)
        );
    } catch (error) {
        console.error('Error searching courses:', error);
        return [];
    }
}

export async function createCourse(course: Omit<Course, 'id'>): Promise<string> {
    try {
        const courseRef = doc(collection(db, 'courses'));
        await setDoc(courseRef, course);
        return courseRef.id;
    } catch (error) {
        console.error('Error creating course:', error);
        throw error;
    }
}

export async function updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
    try {
        await updateDoc(doc(db, 'courses', courseId), updates);
    } catch (error) {
        console.error('Error updating course:', error);
        throw error;
    }
}

export async function deleteCourse(courseId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'courses', courseId));
    } catch (error) {
        console.error('Error deleting course:', error);
        throw error;
    }
}

export async function addCourseLayout(courseId: string, layoutId: string, layout: CourseLayout): Promise<void> {
    try {
        const course = await getCourse(courseId);
        if (!course) throw new Error('Course not found');
        
        const updatedLayouts = {
            ...course.layouts,
            [layoutId]: layout
        };
        
        await updateDoc(doc(db, 'courses', courseId), {
            layouts: updatedLayouts
        });
    } catch (error) {
        console.error('Error adding course layout:', error);
        throw error;
    }
}

// Get courses from local storage (offline fallback)
export function getLocalCourses(): Course[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('courses');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Save courses to local storage
export function saveLocalCourses(courses: Course[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('courses', JSON.stringify(courses));
    } catch (error) {
        console.error('Error saving courses locally:', error);
    }
}

// Find courses near a location
export async function findCoursesNearLocation(
    lat: number,
    lng: number,
    radiusKm: number = 50
): Promise<Course[]> {
    try {
        const allCourses = await getAllCourses();
        
        // Filter courses that have coordinates
        const coursesWithCoords = allCourses.filter(c => c.lat !== undefined && c.lng !== undefined);
        
        // Calculate distance for each course
        const coursesWithDistance = coursesWithCoords.map(course => ({
            course,
            distance: calculateDistance(lat, lng, course.lat!, course.lng!)
        }));
        
        // Filter by radius and sort by distance
        return coursesWithDistance
            .filter(({ distance }) => distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance)
            .map(({ course }) => course);
    } catch (error) {
        console.error('Error finding courses near location:', error);
        return [];
    }
}

// Helper function for distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

