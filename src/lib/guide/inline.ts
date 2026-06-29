// 가이드 본문 텍스트의 초경량 인라인 포맷 파서.
// 지원: **굵게**, [라벨](href). 그 외는 평문. 순수 함수 → 단위 테스트(inline.test.ts).
// 렌더는 inline.tsx의 renderInline에서 이 토큰을 JSX로 변환한다.

export type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'link'; label: string; href: string };

// **...** 또는 [..](..) 를 캡처(나머지는 평문 조각)
const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  for (const part of text.split(TOKEN)) {
    if (part === '') continue;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      tokens.push({ kind: 'bold', value: part.slice(2, -2) });
      continue;
    }
    const link = LINK.exec(part);
    if (link) {
      tokens.push({ kind: 'link', label: link[1], href: link[2] });
      continue;
    }
    tokens.push({ kind: 'text', value: part });
  }
  return tokens;
}
