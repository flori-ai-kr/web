import { test, expect } from '@playwright/test';
import { signIn, trackErrors, expectNoErrors } from './helpers/auth';

// 렌더 스모크: 각 핵심 화면이 mock BFF seed 데이터를 실제로 그려내는지 검증한다.
// mustSee는 seed(e2e/mock-bff/seed.mjs)에서 온 텍스트 — 데이터 경로 전체가 살아있다는 신호.
const PAGES = [
  { path: '/admin', name: '대시보드', mustSee: '6월 업데이트 안내' },
  { path: '/admin/sales', name: '매출', mustSee: '꽃다발' },
  { path: '/admin/expenses', name: '지출', mustSee: '장미 한 단' },
  { path: '/admin/customers', name: '고객', mustSee: '김민지' },
  // 캘린더는 날짜 셀에 '예약 N건' 칩만 보이고 제목은 날짜 선택 후 노출 — 별도 테스트로 검증
  { path: '/admin/calendar', name: '캘린더', mustSee: '예약 1건' },
  { path: '/admin/gallery', name: '사진첩', mustSee: '민지님 생일 꽃다발' },
  { path: '/admin/statistics', name: '통계', mustSee: '매출' },
  { path: '/admin/community', name: '커뮤니티', mustSee: '여름철 꽃 보관 노하우' },
];

test.describe('렌더 스모크', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL!);
  });

  for (const { path, name, mustSee } of PAGES) {
    test(`${name} (${path})`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(path);
      // 인증 게이트에 튕기지 않고 해당 화면에 머무른다
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}`));
      await expect(page.getByText(mustSee).first()).toBeVisible({ timeout: 15_000 });
      expectNoErrors(errors);
    });
  }

  test('캘린더 — 날짜 선택 시 예약 상세 노출', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/admin/calendar');
    await page.getByRole('button', { name: /예약 1건/ }).first().click();
    await expect(page.getByText('결혼기념일 꽃다발').first()).toBeVisible();
    expectNoErrors(errors);
  });
});

test.describe('인증 게이트', () => {
  test('미인증 루트 접근 → /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('미인증 /admin 접근 → /login', async ({ page }) => {
    await page.goto('/admin/sales');
    await expect(page).toHaveURL(/\/login/);
  });

  test('인증 상태 루트 접근 → /admin', async ({ page, context, baseURL }) => {
    await signIn(context, baseURL!);
    await page.goto('/');
    await expect(page).toHaveURL(/\/admin/);
  });
});
