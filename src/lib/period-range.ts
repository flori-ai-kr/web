/** 기간(월·커스텀범위) ↔ 서버 전송용 ISO instant 경계 변환. 서버/클라 공용(KST 고정). */

export type CustomRange = { start: string; end: string };

const pad = (n: number) => String(n).padStart(2, '0');

/** 현재 KST 연·월 (서버 TZ 무관 — UTC+9 환산). */
export function currentKstYearMonth(): { year: number; month: number } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 };
}

/**
 * 기간 → [from, to) ISO instant. KST(+09:00) 명시로 tz 안전.
 * - 월: 해당 월 1일 00:00 KST ~ 다음 달 1일 00:00 KST
 * - 커스텀: start 00:00 KST ~ (end+1일) 00:00 KST
 */
export function periodToRange(
  year: number,
  month: number,
  custom: CustomRange | null,
): { from: string; to: string } {
  if (custom) {
    return { from: `${custom.start}T00:00:00+09:00`, to: addDayKstIso(custom.end) };
  }
  const nm = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return {
    from: `${year}-${pad(month)}-01T00:00:00+09:00`,
    to: `${nm.y}-${pad(nm.m)}-01T00:00:00+09:00`,
  };
}

function addDayKstIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T00:00:00+09:00`;
}
