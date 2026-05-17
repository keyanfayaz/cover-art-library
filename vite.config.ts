import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const envPort = Number(process.env.PORT);
const port = Number.isFinite(envPort) && envPort > 0 ? envPort : 5173;

export default defineConfig({
  plugins: [react()],
  server: { port, host: true, strictPort: false },
});
