import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from '@/lib/api/client';
import {
  getSalesStatistics,
  getExpensesStatistics,
  getReservationStatistics,
  getCustomerStatistics,
} from '../statistics';

const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('statistics actions', () => {
  it('getSalesStatistics calls /statistics/sales with from/to and returns payload', async () => {
    const payload = { kpi: { totalAmount: 100 } };
    mockApiFetch.mockResolvedValue(payload);
    const res = await getSalesStatistics('2026-06-01', '2026-06-30');
    expect(mockApiFetch).toHaveBeenCalledWith('/statistics/sales?from=2026-06-01&to=2026-06-30');
    expect(res).toBe(payload);
  });

  it('getExpensesStatistics calls /statistics/expenses with from/to and returns payload', async () => {
    const payload = { kpi: { totalAmount: 50 } };
    mockApiFetch.mockResolvedValue(payload);
    const res = await getExpensesStatistics('2026-06-01', '2026-06-30');
    expect(mockApiFetch).toHaveBeenCalledWith('/statistics/expenses?from=2026-06-01&to=2026-06-30');
    expect(res).toBe(payload);
  });

  it('getReservationStatistics calls /statistics/reservations with from/to and returns payload', async () => {
    const payload = { kpi: { total: 7 } };
    mockApiFetch.mockResolvedValue(payload);
    const res = await getReservationStatistics('2026-06-01', '2026-06-30');
    expect(mockApiFetch).toHaveBeenCalledWith('/statistics/reservations?from=2026-06-01&to=2026-06-30');
    expect(res).toBe(payload);
  });

  it('getCustomerStatistics calls /statistics/customers with from/to and returns payload', async () => {
    const payload = { kpi: { total: 12 } };
    mockApiFetch.mockResolvedValue(payload);
    const res = await getCustomerStatistics('2026-06-01', '2026-06-30');
    expect(mockApiFetch).toHaveBeenCalledWith('/statistics/customers?from=2026-06-01&to=2026-06-30');
    expect(res).toBe(payload);
  });
});
