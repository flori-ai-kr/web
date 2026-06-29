import { describe, expect, it } from 'vitest';
import { parseInline } from './inline';

describe('parseInline', () => {
  it('평문은 text 토큰 하나', () => {
    expect(parseInline('안녕하세요')).toEqual([{ kind: 'text', value: '안녕하세요' }]);
  });

  it('**굵게** 를 bold 토큰으로 분리', () => {
    expect(parseInline('가운데 **매출** 강조')).toEqual([
      { kind: 'text', value: '가운데 ' },
      { kind: 'bold', value: '매출' },
      { kind: 'text', value: ' 강조' },
    ]);
  });

  it('[라벨](href) 를 link 토큰으로 분리', () => {
    expect(parseInline('[설정](/admin/settings)으로 이동')).toEqual([
      { kind: 'link', label: '설정', href: '/admin/settings' },
      { kind: 'text', value: '으로 이동' },
    ]);
  });

  it('굵게 + 링크 혼합', () => {
    expect(parseInline('**A** 그리고 [B](https://x.com)')).toEqual([
      { kind: 'bold', value: 'A' },
      { kind: 'text', value: ' 그리고 ' },
      { kind: 'link', label: 'B', href: 'https://x.com' },
    ]);
  });

  it('닫히지 않은 ** 는 평문 취급', () => {
    expect(parseInline('a ** b')).toEqual([{ kind: 'text', value: 'a ** b' }]);
  });
});
