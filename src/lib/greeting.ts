/**
 * 대시보드 시간대별 인사말.
 *
 * 인사 구간은 **KST(Asia/Seoul) 기준**으로 계산한다.
 * 서버(컨테이너 기본 UTC)에서 계산해 prop으로 내려주므로 클라이언트 하이드레이션 불일치가 없다.
 * (클라이언트에서 `new Date().getHours()`로 계산하면 UTC↔KST 9시간 차로 인사 구간이 어긋난다.)
 */

/** Asia/Seoul 기준 시(0~23). */
function kstHour(now: Date): number {
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    hour12: false,
  }).format(now);
  // '24' → 0 보정
  return Number(h) % 24;
}

/** 시간대별 인사. 닉네임(없으면 이름)을 붙인다. 이모지 없음. */
function timeGreeting(hour: number, name: string): string {
  const who = name.trim() ? `${name}님` : '사장님';
  if (hour < 6) return `늦은 시간까지 고생 많으세요, ${who}`;
  if (hour < 12) return `좋은 아침이에요, ${who}`;
  if (hour < 18) return `오늘도 화이팅이에요, ${who}`;
  return `오늘 하루도 수고 많으셨어요, ${who}`;
}

/** 대시보드 헤더용 인사말을 KST 기준으로 계산한다. */
export function getDashboardGreeting(name: string, now: Date = new Date()): string {
  return timeGreeting(kstHour(now), name);
}
