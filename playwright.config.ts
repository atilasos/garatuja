import { defineConfig } from '@playwright/test';

const port = 4173;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 3,
  use: { browserName: 'chromium', baseURL: `http://127.0.0.1:${port}`, viewport: { width: 1366, height: 768 } },
  webServer: { command: `npm run build -- --mode test --outDir dist-e2e && npm run preview -- --outDir dist-e2e --host 127.0.0.1 --port ${port} --strictPort`, port, timeout: 30_000 },
});
