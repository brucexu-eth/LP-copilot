import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 plugins:[react()],publicDir:false,base:'/auth-assets/',
 build:{outDir:'public/auth-assets',emptyOutDir:true,rollupOptions:{input:'web/login.jsx',output:{entryFileNames:'login.js',chunkFileNames:'[name]-[hash].js',assetFileNames:'[name]-[hash][extname]'}}},
});
