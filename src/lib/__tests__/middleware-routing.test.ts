import {describe, expect, it} from 'vitest';
import {rootRedirectTarget} from '@/lib/middleware-routing';

describe('rootRedirectTarget', () => {
  it('루트가 아니면 null', () => {
    expect(rootRedirectTarget('/login', {hasAccess: false, hasRefresh: false})).toBeNull();
    expect(rootRedirectTarget('/admin', {hasAccess: true, hasRefresh: true})).toBeNull();
  });
  it('루트 + 인증 쿠키 있으면 /admin', () => {
    expect(rootRedirectTarget('/', {hasAccess: true, hasRefresh: false})).toBe('/admin');
    expect(rootRedirectTarget('/', {hasAccess: false, hasRefresh: true})).toBe('/admin');
  });
  it('루트 + 쿠키 없으면 null(랜딩 렌더)', () => {
    expect(rootRedirectTarget('/', {hasAccess: false, hasRefresh: false})).toBeNull();
  });
});
