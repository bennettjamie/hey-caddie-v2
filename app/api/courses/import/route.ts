import { NextRequest, NextResponse } from 'next/server';
import { importCoursesBatch, DGCourseReviewCourse } from '@/lib/courseImport';

/**
 * API route to import courses from dgcoursereview.com
 * POST /api/courses/import
 * Body: { courses: DGCourseReviewCourse[] }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { courses } = body;
        
        if (!courses || !Array.isArray(courses)) {
            return NextResponse.json(
                { error: 'Invalid request. Expected array of courses.' },
                { status: 400 }
            );
        }
        
        if (courses.length === 0) {
            return NextResponse.json(
                { error: 'No courses provided.' },
                { status: 400 }
            );
        }
        
        // Validate course data structure
        const validCourses: DGCourseReviewCourse[] = courses.filter(course => 
            course && course.name && (course.id || course.name)
        );
        
        if (validCourses.length === 0) {
            return NextResponse.json(
                { error: 'No valid courses found in request.' },
                { status: 400 }
            );
        }
        
        // Import courses
        const result = await importCoursesBatch(validCourses);
        
        return NextResponse.json({
            message: `Imported ${result.success} courses successfully.`,
            ...result
        });
    } catch (error: any) {
        console.error('Error importing courses:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to import courses' },
            { status: 500 }
        );
    }
}





