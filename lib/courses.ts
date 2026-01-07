/**
 * Course management utilities
 */

import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Course, CourseLayout } from '@/types/firestore';
import { logger } from './logger';
import { STORAGE_KEYS, CACHE_LIMITS, FIREBASE_TIMEOUTS } from './constants';

export async function getCourse(courseId: string): Promise<Course | null> {
    try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
            return { id: courseDoc.id, ...courseDoc.data() } as Course;
        }
        return null;
    } catch (error) {
        logger.error('Error getting course', error, {
            courseId,
            operation: 'get-course'
        });
        return null;
    }
}

let activeFetchPromise: Promise<Course[]> | null = null;

export async function getAllCourses(): Promise<Course[]> {
    try {
        // Return active promise if one exists to deduplicate requests
        if (activeFetchPromise) {
            return activeFetchPromise;
        }

        // Add timeout for Firebase operations
        const timeoutPromise = new Promise<Course[]>((_, reject) => {
            setTimeout(() => reject(new Error('Firebase query timed out')), FIREBASE_TIMEOUTS.QUERY_TIMEOUT_MS);
        });

        const fetchPromise = (async () => {
            try {
                const snapshot = await getDocs(collection(db, 'courses'));
                const courses = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                })) as Course[];
                logger.firebase('Courses fetched successfully', {
                    count: courses.length,
                    operation: 'get-all-courses'
                });
                return courses;
            } catch (err) {
                throw err;
            } finally {
                activeFetchPromise = null;
            }
        })();

        activeFetchPromise = fetchPromise;

        const courses = await Promise.race([fetchPromise, timeoutPromise]);

        // Update local cache with fresh data
        if (typeof window !== 'undefined' && courses.length > 0) {
            saveLocalCourses(courses);
        }

        return courses;
    } catch (error) {
        logger.error('Error getting courses from Firebase', error, {
            operation: 'get-all-courses',
            fallbackAction: 'returning-cached-courses'
        });
        // Return cached courses as fallback
        return getLocalCourses();
    }
}

export async function searchCourses(searchTerm: string): Promise<Course[]> {
    try {
        const courses = await getAllCourses();
        const lowerSearch = searchTerm.toLowerCase();
        const results = courses.filter(
            (course) =>
                course.name.toLowerCase().includes(lowerSearch) ||
                course.location?.toLowerCase().includes(lowerSearch)
        );
        logger.info('Course search completed', {
            searchTerm,
            resultCount: results.length,
            operation: 'search-courses'
        });
        return results;
    } catch (error) {
        logger.error('Error searching courses', error, {
            searchTerm,
            operation: 'search-courses'
        });
        return [];
    }
}

export async function createCourse(course: Omit<Course, 'id'>): Promise<string> {

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firebase operation timed out after 10 seconds')), FIREBASE_TIMEOUTS.OPERATION_TIMEOUT_MS);
    });

    try {
        const courseRef = doc(collection(db, 'courses'));

        // Race between setDoc and timeout
        await Promise.race([
            setDoc(courseRef, course),
            timeoutPromise
        ]);
        logger.firebase('Course created successfully', {
            courseId: courseRef.id,
            courseName: course.name,
            operation: 'create-course'
        });
        return courseRef.id;
    } catch (error: any) {
        logger.error('Error creating course', error, {
            courseName: course.name,
            operation: 'create-course',
            fallbackAction: 'saving-to-local-storage'
        });

        // Fallback to localStorage if Firebase fails
        if (typeof window !== 'undefined') {
            const localCourses = getLocalCourses();
            const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newCourseWithId = { id: newId, ...course } as Course;
            localCourses.push(newCourseWithId);
            saveLocalCourses(localCourses);
            logger.storage('Course saved to localStorage', {
                courseId: newId,
                courseName: course.name,
                operation: 'create-course-local'
            });
            return newId;
        }

        throw error;
    }
}

export async function updateCourse(courseId: string, updates: Partial<Course>): Promise<void> {
    try {
        await updateDoc(doc(db, 'courses', courseId), updates);
        logger.firebase('Course updated successfully', {
            courseId,
            updateFields: Object.keys(updates),
            operation: 'update-course'
        });
    } catch (error) {
        logger.error('Error updating course', error, {
            courseId,
            updateFields: Object.keys(updates),
            operation: 'update-course'
        });
        throw error;
    }
}

export async function deleteCourse(courseId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, 'courses', courseId));
        logger.firebase('Course deleted successfully', {
            courseId,
            operation: 'delete-course'
        });
    } catch (error) {
        logger.error('Error deleting course', error, {
            courseId,
            operation: 'delete-course'
        });
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
        logger.firebase('Course layout added successfully', {
            courseId,
            layoutId,
            layoutName: layout.name,
            operation: 'add-course-layout'
        });
    } catch (error) {
        logger.error('Error adding course layout', error, {
            courseId,
            layoutId,
            operation: 'add-course-layout'
        });
        throw error;
    }
}

// Get courses from local storage (offline fallback)
export function getLocalCourses(): Course[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.COURSES);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Filter out any invalid entries
            return Array.isArray(parsed) ? parsed.filter(c => c && c.id && c.name) : [];
        }
        return [];
    } catch {
        return [];
    }
}

// Save courses to local storage
export function saveLocalCourses(courses: Course[]): void {
    if (typeof window === 'undefined') return;
    try {
        // Keep only valid courses and limit per cache limit
        const validCourses = courses.filter(c => c && c.id && c.name).slice(-CACHE_LIMITS.MAX_COURSES_STORED);
        localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(validCourses));
    } catch (error) {
        logger.error('Error saving courses locally', error, {
            courseCount: courses.length,
            operation: 'save-local-courses'
        });
    }
}

// Find courses near a location
export async function findCoursesNearLocation(
    lat: number,
    lng: number,
    radiusKm: number = CACHE_LIMITS.DEFAULT_SEARCH_RADIUS_KM
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
        const results = coursesWithDistance
            .filter(({ distance }) => distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance)
            .map(({ course }) => course);

        logger.info('Nearby courses found', {
            lat,
            lng,
            radiusKm,
            resultCount: results.length,
            operation: 'find-courses-near-location'
        });

        return results;
    } catch (error) {
        logger.error('Error finding courses near location', error, {
            lat,
            lng,
            radiusKm,
            operation: 'find-courses-near-location'
        });
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

/**
 * Update par for a specific hole in a layout
 */
export async function updateCourseHolePar(
    courseId: string,
    layoutId: string,
    holeNumber: number,
    newPar: number
): Promise<void> {
    try {
        const course = await getCourse(courseId);
        if (!course) throw new Error('Course not found');

        const layout = course.layouts?.[layoutId];
        if (!layout) throw new Error('Layout not found');

        const updatedHoles = {
            ...layout.holes,
            [holeNumber]: {
                ...layout.holes[holeNumber],
                par: newPar
            }
        };

        const updatedLayout: CourseLayout = {
            ...layout,
            holes: updatedHoles,
            parTotal: Object.values(updatedHoles).reduce((sum, hole) => sum + (hole.par || 3), 0)
        };

        const updatedLayouts = {
            ...course.layouts,
            [layoutId]: updatedLayout
        };

        await updateDoc(doc(db, 'courses', courseId), {
            layouts: updatedLayouts
        });
        logger.firebase('Course hole par updated', {
            courseId,
            layoutId,
            holeNumber,
            newPar,
            operation: 'update-course-hole-par'
        });
    } catch (error) {
        logger.error('Error updating course hole par', error, {
            courseId,
            layoutId,
            holeNumber,
            newPar,
            operation: 'update-course-hole-par'
        });
        throw error;
    }
}

/**
 * Update entire layout's par and distance values
 */
export async function updateCourseLayoutDetails(
    courseId: string,
    layoutId: string,
    holePars: { [holeNumber: number]: number },
    holeDistances?: { [holeNumber: number]: number },
    courseData?: Course // Optional: pass course data directly to avoid lookup
): Promise<void> {

    // Handle local courses (saved to localStorage)
    if (courseId.startsWith('local_')) {
        let localCourses = getLocalCourses();

        // Use provided course data if available, otherwise look it up
        let course = courseData && courseData.id === courseId ? courseData : localCourses.find(c => c.id === courseId);

        // If course not found, try to get it from raw localStorage
        if (!course && typeof window !== 'undefined') {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.COURSES);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        course = parsed.find((c: any) => c && c.id === courseId);
                        if (course) {
                            localCourses = parsed.filter((c: any) => c && c.id && c.name);
                        }
                    }
                }
            } catch (e) {
                logger.error('Error reading raw localStorage', e, {
                    courseId,
                    operation: 'update-course-layout-details'
                });
            }
        }

        // If still not found, create a minimal course entry from courseData if available
        if (!course && courseData) {
            course = courseData;
            // Add it to localCourses if it's not there
            if (!localCourses.find(c => c.id === courseId)) {
                localCourses.push(course);
            }
        }

        if (!course) {
            throw new Error(`Course not found in localStorage. Course ID: ${courseId}. Please try adding the course again.`);
        }

        const layout = course.layouts?.[layoutId];
        if (!layout) {
            throw new Error('Layout not found');
        }

        // Update all holes with new par and distance values
        const updatedHoles: { [holeNumber: number]: any } = {};
        // Get max hole from either holePars or existing layout
        const existingHoleNumbers = Object.keys(layout.holes || {}).map(k => parseInt(k)).filter(n => !isNaN(n));
        const newHoleNumbers = Object.keys(holePars).map(k => parseInt(k)).filter(n => !isNaN(n));
        const allHoleNumbers = [...existingHoleNumbers, ...newHoleNumbers];
        const maxHole = allHoleNumbers.length > 0 ? Math.max(...allHoleNumbers) : 18;
        for (let i = 1; i <= maxHole; i++) {
            const newPar = holePars[i] !== undefined ? holePars[i] : (layout.holes[i]?.par || 3);
            const newDistance = holeDistances?.[i] !== undefined ? holeDistances[i] : (layout.holes[i]?.distance);

            updatedHoles[i] = {
                ...(layout.holes[i] || {}),
                par: newPar,
                ...(newDistance !== undefined ? { distance: newDistance } : {})
            };
        }

        // Calculate new par total
        const parTotal = Object.values(updatedHoles).reduce((sum, hole) => sum + (hole.par || 3), 0);

        const updatedLayout: CourseLayout = {
            ...layout,
            holes: updatedHoles,
            parTotal
        };

        const updatedLayouts = {
            ...course.layouts,
            [layoutId]: updatedLayout
        };

        // Update the course in the array
        const updatedCourse = {
            ...course,
            layouts: updatedLayouts
        };

        // Save back to localStorage
        const updatedCourses = localCourses.map(c => c.id === courseId ? updatedCourse : c);
        saveLocalCourses(updatedCourses);
        return;
    }

    // Handle Firebase courses
    try {
        const course = await getCourse(courseId);
        if (!course) throw new Error('Course not found');

        const layout = course.layouts?.[layoutId];
        if (!layout) throw new Error('Layout not found');

        // Update all holes with new par and distance values
        const updatedHoles: { [holeNumber: number]: any } = {};
        // Get max hole from either holePars or existing layout
        const existingHoleNumbers = Object.keys(layout.holes || {}).map(k => parseInt(k)).filter(n => !isNaN(n));
        const newHoleNumbers = Object.keys(holePars).map(k => parseInt(k)).filter(n => !isNaN(n));
        const allHoleNumbers = [...existingHoleNumbers, ...newHoleNumbers];
        const maxHole = allHoleNumbers.length > 0 ? Math.max(...allHoleNumbers) : 18;
        for (let i = 1; i <= maxHole; i++) {
            const newPar = holePars[i] !== undefined ? holePars[i] : (layout.holes[i]?.par || 3);
            const newDistance = holeDistances?.[i] !== undefined ? holeDistances[i] : (layout.holes[i]?.distance);

            updatedHoles[i] = {
                ...(layout.holes[i] || {}),
                par: newPar,
                ...(newDistance !== undefined ? { distance: newDistance } : {})
            };
        }

        // Calculate new par total
        const parTotal = Object.values(updatedHoles).reduce((sum, hole) => sum + (hole.par || 3), 0);

        const updatedLayout: CourseLayout = {
            ...layout,
            holes: updatedHoles,
            parTotal
        };

        const updatedLayouts = {
            ...course.layouts,
            [layoutId]: updatedLayout
        };

        await updateDoc(doc(db, 'courses', courseId), {
            layouts: updatedLayouts
        });
        logger.firebase('Course layout details updated', {
            courseId,
            layoutId,
            holeCount: Object.keys(holePars).length,
            operation: 'update-course-layout-details'
        });
    } catch (error) {
        logger.error('Error updating course layout details', error, {
            courseId,
            layoutId,
            holeCount: Object.keys(holePars).length,
            operation: 'update-course-layout-details'
        });
        throw error;
    }
}

/**
 * Save user's custom layout (local or to database)
 */
export async function saveUserCustomLayout(
    courseId: string,
    layoutId: string,
    customLayout: CourseLayout,
    submitToDatabase: boolean
): Promise<void> {
    try {
        // Always save to user's local course data first
        const course = await getCourse(courseId);
        if (!course) throw new Error('Course not found');

        // Update the course with custom layout
        const updatedLayouts = {
            ...course.layouts,
            [`${layoutId}_custom`]: {
                ...customLayout,
                name: `${customLayout.name} (Custom)`
            }
        };

        await updateDoc(doc(db, 'courses', courseId), {
            layouts: updatedLayouts
        });

        logger.firebase('User custom layout saved', {
            courseId,
            layoutId,
            layoutName: customLayout.name,
            submitToDatabase,
            operation: 'save-user-custom-layout'
        });

        // If submitting to database, save to custom layouts collection
        if (submitToDatabase) {
            await submitCustomLayout(courseId, customLayout);
        }
    } catch (error) {
        logger.error('Error saving user custom layout', error, {
            courseId,
            layoutId,
            layoutName: customLayout.name,
            operation: 'save-user-custom-layout'
        });
        throw error;
    }
}

/**
 * Submit custom layout to database for review
 */
export async function submitCustomLayout(
    originalCourseId: string,
    customLayout: CourseLayout
): Promise<string> {
    try {
        const { auth } = await import('./firebase');
        const userId = auth.currentUser?.uid || 'anonymous';

        const customLayoutData = {
            originalCourseId,
            layout: customLayout,
            submittedBy: userId,
            submissionDate: new Date().toISOString(),
            status: 'pending',
            reviewNotes: ''
        };

        const docRef = doc(collection(db, 'userCustomLayouts'));
        await setDoc(docRef, customLayoutData);
        logger.firebase('Custom layout submitted for review', {
            originalCourseId,
            layoutName: customLayout.name,
            userId,
            submissionId: docRef.id,
            operation: 'submit-custom-layout'
        });
        return docRef.id;
    } catch (error) {
        logger.error('Error submitting custom layout', error, {
            originalCourseId,
            layoutName: customLayout.name,
            operation: 'submit-custom-layout'
        });
        throw error;
    }
}

