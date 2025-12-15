/**
 * Server-side script to scrape course data from dgcoursereview.com
 * 
 * Usage:
 *   npx ts-node scripts/scrapeCourses.ts [courseId1] [courseId2] ...
 * 
 * Or import and use programmatically
 * 
 * Note: Always check robots.txt and terms of service before scraping
 */

import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export interface ScrapedCourse {
    id: string;
    name: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    description?: string;
    layouts?: Array<{
        name: string;
        holes: Array<{
            number: number;
            par: number;
            distance?: number;
        }>;
    }>;
}

/**
 * Fetch course page HTML
 */
function fetchCoursePage(courseId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = `https://www.dgcoursereview.com/courses/${courseId}`;
        
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (res) => {
            let data = '';
            
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                return;
            }
            
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

/**
 * Parse course data from HTML
 * This is a basic parser - you may need to adjust based on actual HTML structure
 */
function parseCourseFromHTML(html: string, courseId: string): ScrapedCourse | null {
    try {
        // Extract course name (adjust selector based on actual HTML)
        const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                         html.match(/<title>([^<]+)<\/title>/i);
        const name = nameMatch ? nameMatch[1].trim().replace(/\s*-\s*DGCourseReview.*$/i, '') : 'Unknown';
        
        // Extract location (city, state)
        const locationMatch = html.match(/<span[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                             html.match(/<div[^>]*class="[^"]*location[^"]*"[^>]*>([^<]+)<\/div>/i);
        const location = locationMatch ? locationMatch[1].trim() : '';
        const [city, state] = location.split(',').map(s => s.trim());
        
        // Extract coordinates (if available in page - often in JSON-LD or data attributes)
        let latitude: number | undefined;
        let longitude: number | undefined;
        
        // Try to find coordinates in various formats
        const latMatch = html.match(/data-lat="([^"]+)"/i) || 
                        html.match(/latitude["\s:=]+([0-9.-]+)/i) ||
                        html.match(/"latitude"\s*:\s*([0-9.-]+)/i);
        const lngMatch = html.match(/data-lng="([^"]+)"/i) || 
                        html.match(/longitude["\s:=]+([0-9.-]+)/i) ||
                        html.match(/"longitude"\s*:\s*([0-9.-]+)/i);
        
        if (latMatch) latitude = parseFloat(latMatch[1]);
        if (lngMatch) longitude = parseFloat(lngMatch[1]);
        
        // Try to find JSON-LD structured data
        const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
        if (jsonLdMatch) {
            try {
                const jsonData = JSON.parse(jsonLdMatch[1]);
                if (jsonData.geo) {
                    latitude = jsonData.geo.latitude || jsonData.geo['@latitude'];
                    longitude = jsonData.geo.longitude || jsonData.geo['@longitude'];
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        }
        
        // Extract hole information (this will need to be customized based on actual HTML structure)
        const layouts: Array<{ name: string; holes: Array<{ number: number; par: number; distance?: number }> }> = [];
        
        // Look for hole data tables or structured data
        // This is a placeholder - you'll need to adjust based on actual HTML structure
        const holeTableMatch = html.match(/<table[^>]*class="[^"]*holes?[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
        if (holeTableMatch) {
            // Parse table rows for hole data
            // This is simplified - adjust based on actual structure
            const rows = holeTableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
            const holes: Array<{ number: number; par: number; distance?: number }> = [];
            
            rows.forEach((row, index) => {
                const cells = row.match(/<t[dh][^>]*>([^<]+)<\/t[dh]>/gi) || [];
                if (cells.length >= 2) {
                    const holeNum = parseInt(cells[0].replace(/<[^>]+>/g, '').trim());
                    const par = parseInt(cells[1].replace(/<[^>]+>/g, '').trim());
                    const distance = cells[2] ? parseInt(cells[2].replace(/<[^>]+>/g, '').trim()) : undefined;
                    
                    if (!isNaN(holeNum) && !isNaN(par)) {
                        holes.push({ number: holeNum, par, distance });
                    }
                }
            });
            
            if (holes.length > 0) {
                layouts.push({ name: 'Main', holes });
            }
        }
        
        // Extract description
        const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                            html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
        const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;
        
        return {
            id: courseId,
            name,
            city,
            state,
            latitude,
            longitude,
            address: location,
            description
        };
    } catch (error) {
        console.error(`Error parsing course ${courseId}:`, error);
        return null;
    }
}

/**
 * Scrape multiple courses
 */
export async function scrapeCourses(courseIds: string[]): Promise<ScrapedCourse[]> {
    const courses: ScrapedCourse[] = [];
    
    for (const courseId of courseIds) {
        try {
            console.log(`Scraping course ${courseId}...`);
            const html = await fetchCoursePage(courseId);
            const course = parseCourseFromHTML(html, courseId);
            
            if (course) {
                courses.push(course);
                console.log(`✅ Scraped: ${course.name}`);
            } else {
                console.log(`❌ Failed to parse course ${courseId}`);
            }
            
            // Be respectful - add delay between requests
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        } catch (error: any) {
            console.error(`❌ Failed to scrape ${courseId}:`, error.message);
        }
    }
    
    return courses;
}

// CLI usage
if (require.main === module) {
    const courseIds = process.argv.slice(2);
    
    if (courseIds.length === 0) {
        console.log('Usage: npx ts-node scripts/scrapeCourses.ts [courseId1] [courseId2] ...');
        console.log('Example: npx ts-node scripts/scrapeCourses.ts 12345 67890');
        process.exit(1);
    }
    
    scrapeCourses(courseIds)
        .then(courses => {
            const outputPath = path.join(process.cwd(), 'data', 'scraped-courses.json');
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, JSON.stringify(courses, null, 2));
            console.log(`\n✅ Scraped ${courses.length} courses. Saved to ${outputPath}`);
        })
        .catch(console.error);
}

export { scrapeCourses, parseCourseFromHTML, fetchCoursePage };





