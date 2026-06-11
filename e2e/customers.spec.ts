import { test, expect } from '@playwright/test';
import { signIn, trackErrors, expectNoErrors } from './helpers/auth';

// 고객 CRUD e2e — 연락처는 테넌트 내 unique이므로 실행마다 고유 번호를 생성한다.
const uid = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
// 010 + 8자리 = 11자리 → formatPhoneNumber가 010-XXXX-XXXX(13자)로 포맷
const uniquePhone = () => `010${String(Date.now() + Math.floor(Math.random() * 1e3)).slice(-8)}`;

test.describe('고객 CRUD', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL!);
  });

  test('고객 등록 → 카드 표시', async ({ page }) => {
    const errors = trackErrors(page);
    const name = `e2e고객${uid()}`;

    await page.goto('/admin/customers');
    await expect(page.getByText('김민지').first()).toBeVisible({ timeout: 15_000 });

    // FAB → 고객 등록
    await page.getByRole('button', { name: '액션 메뉴' }).click();
    await page.getByRole('button', { name: '고객 등록' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '고객 등록' })).toBeVisible();

    await dialog.getByPlaceholder('홍길동').fill(name);
    await dialog.getByPlaceholder('010-0000-0000').fill(uniquePhone());

    // 중복 체크(300ms 디바운스) 통과 후 저장 버튼 활성화
    const save = dialog.getByRole('button', { name: '저장' });
    await expect(save).toBeEnabled();
    await save.click();

    // router.refresh() 후 카드 그리드에 새 고객 카드 표시
    await expect(page.getByRole('button', { name: `${name} 상세 보기` })).toBeVisible({ timeout: 15_000 });
    expectNoErrors(errors);
  });

  test('고객 카드 클릭 → 상세 다이얼로그', async ({ page }) => {
    const errors = trackErrors(page);

    await page.goto('/admin/customers');
    // seed 고객 1: 김민지 (010-1234-5678, 매출 연결)
    await page.getByRole('button', { name: '김민지 상세 보기' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '고객 상세' })).toBeVisible();
    await expect(dialog.getByText('010-1234-5678').first()).toBeVisible();
    expectNoErrors(errors);
  });
});
