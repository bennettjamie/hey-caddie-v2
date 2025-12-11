# Course Import Guide

This guide explains how to import course data from dgcoursereview.com into your Hey Caddie app.

## Overview

We have three ways to import courses:
1. **Manual JSON Import** - Paste course data directly
2. **File Upload** - Upload a JSON file with course data
3. **Web Scraping** - Automatically scrape course pages (server-side)

## Method 1: Manual JSON Import (Easiest)

1. Go to `http://localhost:3000/admin/courses`
2. In the "Import Courses" section, paste JSON data in this format:

```json
[
  {
    "id": "12345",
    "name": "Kiwi Park",
    "city": "Portland",
    "state": "Oregon",
    "latitude": 45.5152,
    "longitude": -122.6784,
    "address": "123 Park St, Portland, OR",
    "description": "A beautiful 18-hole disc golf course",
    "layouts": [
      {
        "name": "Main",
        "holes": [
          {"number": 1, "par": 3, "distance": 300},
          {"number": 2, "par": 3, "distance": 250},
          {"number": 3, "par": 4, "distance": 450}
        ]
      },
      {
        "name": "Short",
        "holes": [
          {"number": 1, "par": 3, "distance": 200},
          {"number": 2, "par": 3, "distance": 180}
        ]
      }
    ]
  }
]
```

3. Click "Import Courses"
4. Check the results - you'll see how many succeeded/failed

## Method 2: File Upload

1. Create a JSON file with course data (same format as above)
2. Go to `http://localhost:3000/admin/courses`
3. Click "📁 Upload JSON File"
4. Select your JSON file
5. Click "Import Courses"

## Method 3: Web Scraping (Advanced)

### Prerequisites

You'll need to install additional dependencies for scraping:

```bash
npm install --save-dev @types/node ts-node
```

### Using the Scraper Script

1. Find course IDs from dgcoursereview.com (they're in the URL: `/courses/12345`)

2. Run the scraper:
   ```bash
   npx ts-node scripts/scrapeCourses.ts 12345 67890
   ```

3. The scraped data will be saved to `data/scraped-courses.json`

4. Review and edit the JSON file if needed

5. Import using Method 1 or 2 above

### Important Notes About Scraping

- **Be Respectful**: The scraper includes a 2-second delay between requests
- **Check Terms of Service**: Always review dgcoursereview.com's terms before scraping
- **HTML Structure Changes**: The parser may need adjustments if the website structure changes
- **Rate Limiting**: Don't scrape too many courses at once

## Course Data Format

### Required Fields

- `id` - Unique identifier (usually from dgcoursereview.com)
- `name` - Course name

### Optional Fields

- `city`, `state`, `country` - Location information
- `latitude`, `longitude` - GPS coordinates (for location-based search)
- `address` - Full address
- `phone`, `website` - Contact information
- `description` - Course description
- `difficulty` - 1-5 rating
- `rating` - User rating
- `numRatings` - Number of ratings
- `yearEstablished` - Year course was built
- `courseType` - "Public", "Private", or "Pay to Play"
- `terrain`, `property` - Course characteristics
- `layouts` - Array of course layouts (see below)
- `images` - Array of image URLs
- `amenities` - Array of amenities (e.g., ["Restrooms", "Parking"])

### Layout Format

Each layout should have:
- `name` - Layout name (e.g., "Main", "Short", "Red", "Blue", "Gold")
- `holes` - Array of hole objects:
  - `number` - Hole number (1-18)
  - `par` - Par for the hole
  - `distance` - Distance in feet/meters (optional)
  - `notes` - Additional notes (optional)

## Example: Complete Course Data

```json
{
  "id": "12345",
  "name": "Kiwi Park Disc Golf Course",
  "city": "Portland",
  "state": "Oregon",
  "country": "USA",
  "latitude": 45.5152,
  "longitude": -122.6784,
  "address": "123 Park Street, Portland, OR 97201",
  "phone": "(503) 555-1234",
  "website": "https://example.com",
  "description": "A challenging 18-hole course through wooded terrain.",
  "difficulty": 4,
  "rating": 4.5,
  "numRatings": 127,
  "yearEstablished": 2010,
  "courseType": "Public",
  "terrain": "Wooded",
  "property": "City Park",
  "layouts": [
    {
      "name": "Main",
      "holes": [
        {"number": 1, "par": 3, "distance": 300, "notes": "OB right"},
        {"number": 2, "par": 3, "distance": 250},
        {"number": 3, "par": 4, "distance": 450, "notes": "Mandatory left"}
      ]
    },
    {
      "name": "Short",
      "holes": [
        {"number": 1, "par": 3, "distance": 200},
        {"number": 2, "par": 3, "distance": 180}
      ]
    }
  ],
  "images": [
    "https://example.com/course-photo.jpg"
  ],
  "amenities": ["Restrooms", "Parking", "Water"]
}
```

## Updating Existing Courses

If you import a course with the same `dgcoursereviewId`, it will update the existing course instead of creating a duplicate. This is useful for keeping course data current.

## Troubleshooting

### "Invalid JSON" Error
- Check that your JSON is valid (use a JSON validator)
- Make sure there are no trailing commas
- Ensure all strings are properly quoted

### "No valid courses found"
- Make sure each course has at least an `id` and `name` field
- Check that the array is properly formatted

### Import succeeds but courses don't appear
- Click "Refresh List" button
- Check browser console for errors
- Verify Firestore database is set up correctly

### Scraping fails
- Check your internet connection
- Verify the course ID exists on dgcoursereview.com
- The website structure may have changed - you may need to update the parser

## Next Steps

After importing courses:
1. Test course selection in the app
2. Verify location-based search works (if coordinates are included)
3. Check that layouts are displaying correctly
4. Test starting a round with imported courses

## API Endpoint

You can also import courses programmatically using the API:

```javascript
const response = await fetch('/api/courses/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    courses: [/* course data */]
  })
});

const result = await response.json();
console.log(result);
```

