import { defineConfig, devices } from '@playwright/test';

// e2e 아키텍처: Playwright → next(3110) → mock BFF(18080)
// apiFetch는 Next 서버→BFF 서버 간 호출이라 page.route()로 가로챌 수 없다.
// 대신 API_URL을 fixture 기반 mock BFF(e2e/mock-bff)로 돌려 실서버 없이 검증한다.
const WEB_PORT = 3110;
const MOCK_BFF_PORT = 18080;

// next build가 lib/env.ts 검증을 통과하기 위한 더미 값.
// STORAGE_PUBLIC_URL은 seed 사진 URL 호스트(cdn.example.com)를 next/image 허용 목록에 올린다.
const webEnv = {
  API_URL: `http://127.0.0.1:${MOCK_BFF_PORT}`,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'e2e-dummy-vapid-public-key',
  INTERNAL_API_KEY: 'e2e-dummy-internal-api-key-0123456789abcdef',
  STORAGE_PUBLIC_URL: 'https://cdn.example.com',
  // .env.local의 실제 ID가 베이크되지 않도록 비활성화 (빈 값 → 미로드)
  NEXT_PUBLIC_GA_MEASUREMENT_ID: '',
  NEXT_PUBLIC_CLARITY_PROJECT_ID: '',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'on-first-retry',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/mock-bff/server.mjs',
      port: MOCK_BFF_PORT,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_BFF_PORT: String(MOCK_BFF_PORT) },
    },
    {
      command: `npx next build && npx next start -p ${WEB_PORT}`,
      port: WEB_PORT,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
      env: webEnv,
    },
  ],
});
