import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 45_000,
    expect: {
        timeout: 8_000
    },
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: 'http://127.0.0.1:5173',
        trace: 'on-first-retry'
    },
    webServer: [
        {
            command: 'pnpm --filter @app/api build && pnpm --filter @app/api start',
            url: 'http://127.0.0.1:4000/healthz',
            reuseExistingServer: !process.env.CI
        },
        {
            command: 'pnpm --filter @app/web dev',
            url: 'http://127.0.0.1:5173',
            reuseExistingServer: !process.env.CI
        }
    ]
});
