import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:9003',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/fabric')) {
                        return 'fabric';
                    }
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }
                    return undefined;
                },
            },
        },
    },
    test: {
        environment: 'jsdom',
        exclude: [
            ...configDefaults.exclude,
            'e2e/**',
            'e2e-real/**',
            'playwright.config.js',
            'playwright.real.config.js',
        ],
    }
})
