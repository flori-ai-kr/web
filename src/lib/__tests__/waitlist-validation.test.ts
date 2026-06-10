import {describe, expect, it} from 'vitest';
import {waitlistSchema} from '@/lib/validations';

describe('waitlistSchema', () => {
  it('가게명+전화번호 정상', () => {
    const r = waitlistSchema.safeParse({shop_name: '헤이즐', phone: '010-1234-5678'});
    expect(r.success).toBe(true);
  });
  it('가게명 빈값 거부', () => {
    expect(waitlistSchema.safeParse({shop_name: '', phone: '010-1234-5678'}).success).toBe(false);
  });
  it('전화번호 형식 오류 거부', () => {
    expect(waitlistSchema.safeParse({shop_name: 'A', phone: '123'}).success).toBe(false);
  });
  it('가게명 50자 초과 거부', () => {
    expect(waitlistSchema.safeParse({shop_name: 'ㄱ'.repeat(51), phone: '01012345678'}).success).toBe(false);
  });
});
