/**
 * 대시보드 인사말 + 응원 문구.
 *
 * 시간대 인사·명언 회전은 모두 **KST(Asia/Seoul) 기준**으로 계산한다.
 * 서버(Vercel=UTC)에서 계산해 prop으로 내려주므로 클라이언트 하이드레이션 불일치가 없다.
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

/** 꽃집 사장님 톤의 따뜻한 응원 문구. 이모지 없음. */
const QUOTES: readonly string[] = [
  '작은 꽃 한 송이가 누군가의 하루를 바꿔요.',
  '오늘 만든 꽃다발이 누군가에겐 오래 기억될 거예요.',
  '꾸준함이 재능을 이겨요. 오늘도 한 걸음씩.',
  '완벽한 날은 없어요. 오늘 할 수 있는 만큼이면 충분해요.',
  '바쁜 날도, 한가한 날도 모두 사장님의 자산이 돼요.',
  '손님의 미소가 가장 좋은 매출이에요.',
  '작은 가게의 정성은 결국 단골을 만들어요.',
  '오늘 기록한 숫자가 내일의 좋은 결정을 도와줘요.',
  '계절이 바뀌듯 매출에도 흐름이 있어요. 조급해하지 마세요.',
  '꽃처럼, 천천히 피어도 결국 활짝 펴요.',
  '지치는 날엔, 오늘 판 꽃이 누군가를 웃게 했다는 걸 기억해요.',
  '한 송이도 소중히. 그 마음이 가게를 키워요.',
];

/** 30분 단위로 회전하는 응원 문구(같은 30분 블록 내에서는 고정). */
function rotatingQuote(now: Date): string {
  const block = Math.floor(now.getTime() / (1000 * 60 * 30));
  return QUOTES[block % QUOTES.length];
}

export interface DashboardGreeting {
  greeting: string;
  quote: string;
}

/** 대시보드 헤더용 인사말 + 응원 문구를 KST 기준으로 계산한다. */
export function getDashboardGreeting(name: string, now: Date = new Date()): DashboardGreeting {
  return {
    greeting: timeGreeting(kstHour(now), name),
    quote: rotatingQuote(now),
  };
}
