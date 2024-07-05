import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    plugins: [vue(), viteCompression(), visualizer()],
    server: {
        host: '0.0.0.0',
        port: 3000,
    },
});
