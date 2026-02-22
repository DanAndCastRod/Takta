import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:9003',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
