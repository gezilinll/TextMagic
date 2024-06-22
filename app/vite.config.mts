import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    plugins: [vue(), viteCompression(), visualizer()],
    server: {
        https: {
            key: fs.readFileSync('certs/privkey.pem'),
            cert: fs.readFileSync('certs/fullchain.pem'),
        },
    },
});
