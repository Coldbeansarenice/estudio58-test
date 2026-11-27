import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `npm run dev` already listens on your local network (--host),
// so a phone on the same Wi-Fi can open the "Network" address Vite prints.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
});
