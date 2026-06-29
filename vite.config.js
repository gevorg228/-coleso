import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages set base to '/<repo-name>/'. For Vercel/Netlify/Cloudflare keep '/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
})
