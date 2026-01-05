/**
 * Course import utilities for dgcoursereview.com data
 */

import { Course, CourseLayout, HoleInfo } from '@/types/firestore';
import { createCourse, updateCourse, getCourse } from './courses';

export interface DGCourseReviewCourse {
    id: string;
    name: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    phone?: string;
    website?: string;
    description?: string;
    difficulty?: number;
    rating?: number;
    numRatings?: number;
    yearEstablished?: number;
    courseType?: string;
    terrain?: string;
    property?: string;
    layouts?: Array<{
        name: string;
        holes: Array<{
            number: number;
            par: number;
            distance?: number;
            notes?: string;
        }>;
    }>;
    images?: string[];
    amenities?: string[];
}

/**
 * Transform dgcoursereview data to our Course format
 */
export function transformDGCourseReviewData(data: DGCourseReviewCourse): Omit<Course, 'id'> {
    const layouts: { [key: string]: CourseLayout } = {};

    // Process layouts
    if (data.layouts && data.layouts.length > 0) {
        data.layouts.forEach((layout, index) => {
            const layoutId = layout.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `layout_${index}`;
            const holes: { [holeNumber: number]: HoleInfo } = {};
            let parTotal = 0;

            layout.holes.forEach((hole) => {
                holes[hole.number] = {
                    par: hole.par,
                    distance: hole.distance,
                    notes: hole.notes
                };
                parTotal += hole.par;
            });

            layouts[layoutId] = {
                name: layout.name,
                holes,
                parTotal
            };
        });
    } else {
        // Default layout if none provided - create 18 holes par 3
        const defaultHoles: { [holeNumber: number]: HoleInfo } = {};
        for (let i = 1; i <= 18; i++) {
            defaultHoles[i] = { par: 3 };
        }

        layouts['default'] = {
            name: 'Main',
            holes: defaultHoles,
            parTotal: 54
        };
    }

    return {
        name: data.name,
        location: data.city && data.state ? `${data.city}, ${data.state}` : data.address || '',
        city: data.city,
        state: data.state,
        country: data.country,
        lat: data.latitude,
        lng: data.longitude,
        address: data.address,
        phone: data.phone,
        website: data.website,
        description: data.description,
        difficulty: data.difficulty,
        rating: data.rating,
        numRatings: data.numRatings,
        yearEstablished: data.yearEstablished,
        courseType: data.courseType as any,
        terrain: data.terrain,
        property: data.property,
        dgcoursereviewId: data.id,
        dgcoursereviewUrl: `https://www.dgcoursereview.com/courses/${data.id}`,
        layouts,
        images: data.images || [],
        amenities: data.amenities || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Import a single course
 */
export async function importCourse(data: DGCourseReviewCourse): Promise<string> {
    const courseData = transformDGCourseReviewData(data);
    return await createCourse(courseData);
}

/**
 * Import or update a course (checks if dgcoursereviewId exists)
 */
export async function importOrUpdateCourse(data: DGCourseReviewCourse): Promise<string> {
    try {
        // Try to find existing course by dgcoursereviewId
        const { getAllCourses } = await import('@/lib/courses');
        const allCourses = await getAllCourses();
        const existing = allCourses.find(c => c.dgcoursereviewId === data.id);

        if (existing) {
            // Update existing course
            const courseData = transformDGCourseReviewData(data);
            await updateCourse(existing.id, {
                ...courseData,
                updatedAt: new Date().toISOString()
            });
            return existing.id;
        } else {
            // Create new course
            return await importCourse(data);
        }
    } catch (error) {
        console.error('Error in importOrUpdateCourse:', error);
        throw error;
    }
}

/**
 * Batch import multiple courses
 */
export async function importCoursesBatch(courses: DGCourseReviewCourse[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ course: string; error: string }>;
}> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ course: string; error: string }> = [];

    for (const course of courses) {
        try {
            await importOrUpdateCourse(course);
            success++;
        } catch (error: any) {
            failed++;
            errors.push({
                course: course.name || course.id,
                error: error.message || 'Unknown error'
            });
        }
    }

    return { success, failed, errors };
}

