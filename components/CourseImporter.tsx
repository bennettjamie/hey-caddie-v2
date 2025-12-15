'use client';

import { useState } from 'react';
import { importCoursesBatch, DGCourseReviewCourse } from '@/lib/courseImport';

export default function CourseImporter() {
    const [jsonInput, setJsonInput] = useState('');
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{
        success: number;
        failed: number;
        errors: Array<{ course: string; error: string }>;
    } | null>(null);

    const handleImport = async () => {
        try {
            setImporting(true);
            setResult(null);
            
            const courses: DGCourseReviewCourse[] = JSON.parse(jsonInput);
            
            if (!Array.isArray(courses)) {
                setResult({
                    success: 0,
                    failed: 1,
                    errors: [{ course: 'Parse Error', error: 'Input must be an array of courses' }]
                });
                return;
            }
            
            // Call API route
            const response = await fetch('/api/courses/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courses })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setResult(data);
                setJsonInput(''); // Clear input on success
            } else {
                setResult({
                    success: 0,
                    failed: courses.length,
                    errors: [{ course: 'Import', error: data.error }]
                });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
            setResult({
                success: 0,
                failed: 1,
                errors: [{ course: 'Parse Error', error: errorMessage }]
            });
        } finally {
            setImporting(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setJsonInput(content);
        };
        reader.readAsText(file);
    };

    return (
        <div className="card">
            <h2>Import Courses from dgcoursereview.com</h2>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                Paste JSON data from dgcoursereview.com API or scraped data. 
                Courses with the same dgcoursereviewId will be updated.
            </p>
            
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ cursor: 'pointer' }}>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <span className="btn" style={{ backgroundColor: 'var(--info)', fontSize: '0.875rem' }}>
                        📁 Upload JSON File
                    </span>
                </label>
            </div>
            
            <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='[{"id": "12345", "name": "Course Name", "city": "City", "state": "State", "latitude": 40.7128, "longitude": -74.0060, "layouts": [{"name": "Main", "holes": [{"number": 1, "par": 3, "distance": 300}]}]}]'
                style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '1rem',
                    marginTop: '1rem',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    resize: 'vertical'
                }}
            />
            
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                    className="btn"
                    onClick={handleImport}
                    disabled={!jsonInput.trim() || importing}
                    style={{
                        flex: 1,
                        backgroundColor: 'var(--success)'
                    }}
                >
                    {importing ? 'Importing...' : (() => {
                        try {
                            const parsed = jsonInput.trim() ? JSON.parse(jsonInput.trim()) : [];
                            const count = Array.isArray(parsed) ? parsed.length : 0;
                            return count > 0 ? `Import ${count} Course${count !== 1 ? 's' : ''}` : 'Import Courses';
                        } catch {
                            return 'Import Courses';
                        }
                    })()}
                </button>
            </div>
            
            {result && (
                <div style={{ 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    background: result.failed === 0 
                        ? 'rgba(46, 204, 113, 0.1)' 
                        : 'rgba(243, 156, 18, 0.1)', 
                    borderRadius: '8px',
                    border: `2px solid ${result.failed === 0 ? 'var(--success)' : 'var(--warning)'}`
                }}>
                    <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        {result.failed === 0 ? '✅ All courses imported successfully!' : '⚠️ Import completed with errors'}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Success:</strong> {result.success}
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Failed:</strong> {result.failed}
                    </div>
                    {result.errors.length > 0 && (
                        <div>
                            <strong>Errors:</strong>
                            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                {result.errors.map((err, i) => (
                                    <li key={i} style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>
                                        <strong>{err.course}:</strong> {err.error}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(52, 152, 219, 0.1)', borderRadius: '8px', fontSize: '0.875rem' }}>
                <strong>Example JSON format:</strong>
                <pre style={{ marginTop: '0.5rem', fontSize: '0.75rem', overflow: 'auto' }}>
{`[
  {
    "id": "12345",
    "name": "Kiwi Park",
    "city": "Portland",
    "state": "Oregon",
    "latitude": 45.5152,
    "longitude": -122.6784,
    "layouts": [
      {
        "name": "Main",
        "holes": [
          {"number": 1, "par": 3, "distance": 300},
          {"number": 2, "par": 3, "distance": 250}
        ]
      }
    ]
  }
]`}
                </pre>
            </div>
        </div>
    );
}

