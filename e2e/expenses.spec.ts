import { test, expect } from '@playwright/test';
import { signIn, trackErrors, expectNoErrors } from './helpers/auth';

// 지출 CRUD e2e — mock BFF 인메모리 공유 → 고유 접미사로 격리.
const uid = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test.describe('지출 CRUD', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL!);
  });

  test('지출 등록 → 목록 반영', async ({ page }) => {
    const errors = trackErrors(page);
    const itemName = `e2e-지출-${uid()}`;

    await page.goto('/admin/expenses');
    await expect(page.getByText('장미 한 단').first()).toBeVisible({ timeout: 15_000 });

    // FAB → 지출 등록
    await page.getByRole('button', { name: '액션 메뉴' }).click();
    await page.getByRole('button', { name: '지출 등록' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '지출 등록' })).toBeVisible();

    // 물품명 + 단가 (카테고리·수량·결제방식은 기본값 사용)
    await dialog.getByPlaceholder('예: 장미 50송이, 배달비').fill(itemName);
    await dialog.getByPlaceholder('0', { exact: true }).fill('15000');

    await dialog.getByRole('button', { name: '저장' }).click();

    // router.refresh() 후 목록에 새 항목 표시
    await expect(page.getByText(itemName)).toBeVisible({ timeout: 15_000 });
    expectNoErrors(errors);
  });

  test('검색 입력 → 디바운스 후 결과 필터링', async ({ page }) => {
    const errors = trackErrors(page);

    await page.goto('/admin/expenses');
    await expect(page.getByText('장미 한 단').first()).toBeVisible({ timeout: 15_000 });

    // seed 지출 4의 품목명으로 검색 (300ms 디바운스 → 서버사이드 검색)
    await page.getByRole('textbox', { name: '지출 검색' }).fill('리시안셔스');

    await expect(page.getByText('리시안셔스').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('장미 한 단')).toHaveCount(0);
    expectNoErrors(errors);
  });
});
