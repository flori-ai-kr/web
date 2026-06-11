import { test, expect } from '@playwright/test';
import { signIn, trackErrors, expectNoErrors } from './helpers/auth';

// 캘린더(예약) CRUD e2e — seed 예약은 오늘+1(결혼기념일, confirmed)·오늘+2(개업 화분, pending).
// 새 예약은 오늘+4(월말 클램프)에 등록해 seed 날짜·smoke 테스트와 충돌하지 않게 한다.
const uid = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const uniquePhone = () => `010${String(Date.now() + Math.floor(Math.random() * 1e3)).slice(-8)}`;

const now = new Date();
const MONTH = now.getMonth() + 1;
const LAST_DAY = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const clampDay = (d: number) => Math.min(Math.max(d, 1), LAST_DAY);

// 캘린더 그리드 날짜 셀 (aria-label: "M월 d일[ 예약 N건][ 일정 N건]")
const dayCell = (day: number, suffix = '') =>
  new RegExp(`^${MONTH}월 ${day}일${suffix}`);

test.describe('캘린더 예약 CRUD', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signIn(context, baseURL!);
  });

  test('예약 등록 → 캘린더 날짜 칩 반영', async ({ page }) => {
    const errors = trackErrors(page);
    const title = `e2e예약${uid()}`;
    const targetDay = clampDay(now.getDate() + 4);

    await page.goto('/admin/calendar');
    // seed 예약 칩 로딩 대기
    await expect(page.getByText(/예약 \d건/).first()).toBeVisible({ timeout: 15_000 });

    // 대상 날짜 선택 → 픽업 일자가 해당 날짜로 프리필된다
    await page.getByRole('button', { name: dayCell(targetDay) }).click();
    // 선택 날짜 헤더의 '예약' 추가 버튼 (탭 버튼보다 DOM 앞)
    await page.getByRole('button', { name: '예약', exact: true }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: '새 예약' })).toBeVisible();

    await dialog.getByPlaceholder('홍길동').fill(`e2e예약고객${uid()}`);
    await dialog.getByPlaceholder('010-0000-0000').fill(uniquePhone());
    // 카테고리 선택 시 제목이 자동 입력되므로, 그 뒤에 고유 제목으로 덮어쓴다
    await dialog.getByLabel('상품 카테고리').selectOption({ label: '꽃다발' });
    await dialog.getByPlaceholder('프로포즈 꽃다발').fill(title);
    await dialog.getByLabel('결제방식').selectOption({ label: '카드' });
    await dialog.getByLabel('금액', { exact: true }).fill('50000');

    await dialog.getByRole('button', { name: '등록', exact: true }).click();

    // 등록 완료 → 폼 닫힘 + 선택 날짜 패널에 새 예약 카드 + 날짜 칩 반영
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: dayCell(targetDay, ' 예약 \\d건') }),
    ).toBeVisible({ timeout: 15_000 });
    expectNoErrors(errors);
  });

  test('예약 완료(픽업) 토글', async ({ page }) => {
    const errors = trackErrors(page);
    const seedDay = clampDay(now.getDate() + 1); // seed 예약 1 (confirmed)

    await page.goto('/admin/calendar');
    await expect(page.getByText(/예약 \d건/).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: dayCell(seedDay, ' 예약 \\d건') }).click();
    await expect(page.getByText('결혼기념일 꽃다발')).toBeVisible();

    // confirmed 상태 → 픽업 완료 토글 (pending 카드의 비활성 버튼은 제외)
    await page.getByRole('button', { name: '픽업 완료로 변경', disabled: false }).click();

    // PATCH 후 새로고침 → completed 상태로 전환
    await expect(page.getByRole('button', { name: '픽업 완료 취소' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('픽업 완료', { exact: true })).toBeVisible();
    expectNoErrors(errors);
  });
});
