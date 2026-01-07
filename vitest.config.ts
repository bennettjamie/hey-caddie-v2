import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./test/setup.ts'],
        alias: {
            '@': path.resolve(__dirname, './')
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json', 'lcov'],
            exclude: [
                'node_modules/**',
                'test/**',
                '**/*.test.ts',
                '**/*.test.tsx',
                '**/*.spec.ts',
                '**/*.spec.tsx',
                '**/*.config.ts',
                '**/*.config.js',
                'scripts/**',
                '.next/**',
                'public/**',
                'docs/**',
                '*.md'
            ],
            include: [
                'lib/**/*.ts',
                'components/**/*.tsx',
                'context/**/*.tsx',
                'app/**/*.tsx'
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 70,
                statements: 70
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './')
        }
    }
});
