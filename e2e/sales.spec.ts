import { test, expect } from '@playwright/test';
import { signIn, trackErrors, expectNoErrors } from './helpers/auth';

// 매출 CRUD e2e — mock BFF(e2e/mock-bff) 인메모리에 실제로 쓰고 읽는다.
// 테스트 간 상태가 공유되므로 등록 데이터는 고유 접미사로 격리한다.
const uid = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

test.describe('매출 CRUD', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL!);
  });

  test('매출 등록 → 목록 반영', async ({ page }) => {
    const errors = trackErrors(page);
    const memo = `e2e-매출-${uid()}`;

    await page.goto('/admin/sales');
    await expect(page.getByText('꽃다발').first()).toBeVisible({ timeout: 15_000 });

    // FAB → 매출 등록
    await page.getByRole('button', { name: '액션 메뉴' }).click();
    await page.getByRole('button', { name: '매출 등록' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '매출 등록' })).toBeVisible();

    // 금액 (AmountInput — 폼 내 유일한 placeholder '0')
    await dialog.getByPlaceholder('0', { exact: true }).fill('87000');
    // 카테고리 (첫 번째 combobox = 카테고리 Select)
    await dialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: '화분' }).click();
    // 메모 — 목록에서 식별할 고유 텍스트
    await dialog.getByPlaceholder('메모를 입력하세요').fill(memo);

    await dialog.getByRole('button', { name: '저장' }).click();

    // 등록 성공 → 사진 추가 유도 다이얼로그 → 나중에
    await page.getByRole('button', { name: '나중에' }).click({ timeout: 15_000 });

    // router.refresh() 후 목록에 새 항목 표시 (오늘 날짜 그룹, 고유 메모로 식별)
    await expect(
      page.getByRole('button', { name: '화분 ₩87,000 상세 보기' }).filter({ hasText: memo }),
    ).toBeVisible({ timeout: 15_000 });
    expectNoErrors(errors);
  });

  test('기존 항목 클릭 → 상세 다이얼로그', async ({ page }) => {
    const errors = trackErrors(page);

    await page.goto('/admin/sales');
    // seed 매출 1: 꽃다발 45,000 / 김민지
    await page.getByRole('button', { name: '꽃다발 ₩45,000 상세 보기' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '매출 상세' })).toBeVisible();
    await expect(dialog.getByText('₩45,000').first()).toBeVisible();
    await expect(dialog.getByText('김민지').first()).toBeVisible();
    expectNoErrors(errors);
  });

  test('카테고리 필터 적용 → URL 쿼리 반영 + 목록 필터링', async ({ page }) => {
    const errors = trackErrors(page);

    await page.goto('/admin/sales');
    await expect(page.getByText('꽃다발').first()).toBeVisible({ timeout: 15_000 });

    // 카테고리 드롭다운 → 꽃다발 선택 (seed id 11)
    await page.getByRole('button', { name: /카테고리/ }).click();
    await page.getByRole('button', { name: '꽃다발', exact: true }).click();

    await expect(page).toHaveURL(/category=11/);
    // 꽃다발 항목은 보이고, 화분(seed 매출 3)은 사라진다
    await expect(page.getByRole('button', { name: '꽃다발 ₩45,000 상세 보기' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: '화분 ₩55,000 상세 보기' })).toHaveCount(0);
    expectNoErrors(errors);
  });
});
