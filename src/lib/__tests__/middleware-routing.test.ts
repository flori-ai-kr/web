import {describe, expect, it} from 'vitest';
import {authEntryRedirectTarget} from '@/lib/middleware-routing';

describe('authEntryRedirectTarget', () => {
  it('진입점이 아니면 null', () => {
    expect(authEntryRedirectTarget('/admin', {hasAccess: true, hasRefresh: true})).toBeNull();
    expect(authEntryRedirectTarget('/onboarding', {hasAccess: false, hasRefresh: false})).toBeNull();
  });
  it('루트 + 인증 쿠키 있으면 /admin', () => {
    expect(authEntryRedirectTarget('/', {hasAccess: true, hasRefresh: false})).toBe('/admin');
    expect(authEntryRedirectTarget('/', {hasAccess: false, hasRefresh: true})).toBe('/admin');
  });
  it('루트 + 쿠키 없으면 /login (랜딩은 별도 사이트로 이관)', () => {
    expect(authEntryRedirectTarget('/', {hasAccess: false, hasRefresh: false})).toBe('/login');
  });
  it('로그인 + 인증 쿠키 있으면 /admin (이미 로그인 상태면 로그인 화면 건너뜀)', () => {
    expect(authEntryRedirectTarget('/login', {hasAccess: true, hasRefresh: false})).toBe('/admin');
    expect(authEntryRedirectTarget('/login', {hasAccess: false, hasRefresh: true})).toBe('/admin');
  });
  it('로그인 + 쿠키 없으면 null (로그인 화면 표시)', () => {
    expect(authEntryRedirectTarget('/login', {hasAccess: false, hasRefresh: false})).toBeNull();
  });
});
