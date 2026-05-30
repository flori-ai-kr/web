import { describe, it, expect, vi, beforeEach } from 'vitest';

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const apiFetchMock = vi.fn();
const requireAuthMock = vi.fn(async () => ({ id: '1', name: 'n', email: 'e' }));

vi.mock('next/navigation', () => ({ redirect: (u: string) => redirectMock(u) }));
vi.mock('@/lib/api/client', () => ({ apiFetch: (...a: unknown[]) => apiFetchMock(...a) }));
vi.mock('@/lib/auth-guard', () => ({ requireAuth: () => requireAuthMock() }));

import { requireAdmin } from '@/lib/admin-guard';
import { AppError, ErrorCode } from '@/lib/errors';

describe('requireAdmin', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    apiFetchMock.mockReset();
  });

  it('admin이면 통과', async () => {
    apiFetchMock.mockResolvedValue({ isAdmin: true });
    await expect(requireAdmin()).resolves.toMatchObject({ id: '1' });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('비admin(403→UNAUTHORIZED)이면 /admin으로 redirect', async () => {
    apiFetchMock.mockRejectedValue(new AppError(ErrorCode.UNAUTHORIZED, 'no'));
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/admin');
  });

  it('기타 에러는 그대로 전파', async () => {
    apiFetchMock.mockRejectedValue(new AppError(ErrorCode.UNKNOWN, 'boom'));
    await expect(requireAdmin()).rejects.toThrow('boom');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
