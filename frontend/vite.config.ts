import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use repo path for GitHub Pages project site:
  base: "/dfi-labs-onboarding/",
})
