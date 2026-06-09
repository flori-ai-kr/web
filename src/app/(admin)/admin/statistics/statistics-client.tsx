'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/layout/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart2, AlertCircle, RefreshCw } from 'lucide-react';
import { DateRangeSelector } from './components/DateRangeSelector';
import { type RangePreset } from './lib/range';
import {
  getSalesStatistics,
  getExpensesStatistics,
  getReservationStatistics,
  getCustomerStatistics,
  type SalesStatistics,
  type ExpensesStatistics,
  type ReservationStatistics,
  type CustomerStatistics,
} from '@/lib/actions/statistics';
import { SalesStatPanel } from './components/SalesStatPanel';
import { ExpenseStatPanel } from './components/ExpenseStatPanel';
import { ReservationStatPanel } from './components/ReservationStatPanel';
import { CustomerStatPanel } from './components/CustomerStatPanel';

// ─── Tab config ──────────────────────────────────────────────────────────────

export type StatTab = 'sales' | 'expenses' | 'reservations' | 'customers';

const TABS: { value: StatTab; label: string }[] = [
  { value: 'sales', label: '매출' },
  { value: 'expenses', label: '지출' },
  { value: 'reservations', label: '예약' },
  { value: 'customers', label: '고객' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type TabData = SalesStatistics | ExpensesStatistics | ReservationStatistics | CustomerStatistics;

interface CacheEntry {
  data: TabData | null;
  from: string;
  to: string;
  error: boolean;
  loading: boolean;
}

type DataCache = Record<string, CacheEntry>;

function cacheKey(tab: StatTab, from: string, to: string): string {
  return `${tab}__${from}__${to}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  initialPreset: RangePreset;
  initialFrom: string;
  initialTo: string;
  initialTab: StatTab;
  initialData: TabData | null;
  initialError: boolean;
}

// ─── Loading skeleton for stats panels ───────────────────────────────────────

function StatsPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton key="left" className="h-40 rounded-xl" />
        <Skeleton key="right" className="h-40 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Client ──────────────────────────────────────────────────────────────────

export function StatisticsClient({
  initialPreset,
  initialFrom,
  initialTo,
  initialTab,
  initialData,
  initialError,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Range state
  const [preset, setPreset] = useState<RangePreset>(initialPreset);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  // Tab state
  const [activeTab, setActiveTab] = useState<StatTab>(initialTab);

  // Per-tab data cache stored in state so reads during render are fine
  const initialKey = cacheKey(initialTab, initialFrom, initialTo);
  const [cache, setCache] = useState<DataCache>(() => {
    const seed: DataCache = {};
    seed[initialKey] = {
      data: initialData,
      from: initialFrom,
      to: initialTo,
      error: initialError,
      loading: false,
    };
    return seed;
  });

  // In-flight fetch guard: prevents duplicate concurrent fetches on fast tab/range clicks
  const inFlight = useRef<Set<string>>(new Set());

  // resolvedKeys tracks keys that have been fully fetched (data or error), seeded
  // with the initial SSR key so it's never re-fetched on the first render.
  const resolvedKeys = useRef<Set<string>>(new Set([initialKey]));

  // ─── Mount: trigger fetch for active tab if not yet resolved ────────────────
  // This closes the gap where initialData is null/absent (no error) and nothing
  // would trigger a fetch — e.g. the page rendered with initialError=false but
  // initialData=null (BFF returned empty), and no user interaction has happened yet.
  useEffect(() => {
    const key = cacheKey(initialTab, initialFrom, initialTo);
    if (!resolvedKeys.current.has(key)) {
      fetchTab(initialTab, initialFrom, initialTo);
    }
    // Run once on mount only — deps are stable initial props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── URL sync helper ────────────────────────────────────────────────────────

  const pushURL = useCallback(
    (nextPreset: RangePreset, nextFrom: string, nextTo: string, nextTab: StatTab) => {
      const params = new URLSearchParams();
      params.set('range', nextPreset);
      if (nextFrom) params.set('from', nextFrom);
      if (nextTo) params.set('to', nextTo);
      params.set('tab', nextTab);
      startTransition(() => {
        router.replace(`/admin/statistics?${params.toString()}`);
      });
    },
    [router],
  );

  // ─── Fetch a tab's data client-side ────────────────────────────────────────

  const fetchTab = useCallback(
    async (tab: StatTab, f: string, t: string) => {
      const key = cacheKey(tab, f, t);

      // Already fully resolved (data or error) — skip refetch
      if (resolvedKeys.current.has(key)) return;

      // Duplicate concurrent fetch guard — skip if already in flight
      if (inFlight.current.has(key)) return;

      inFlight.current.add(key);
      setCache((prev) => {
        if (prev[key]) return prev; // already seeded (e.g. from initialData)
        return { ...prev, [key]: { data: null, from: f, to: t, error: false, loading: true } };
      });

      try {
        let data: TabData;
        switch (tab) {
          case 'sales':
            data = await getSalesStatistics(f, t);
            break;
          case 'expenses':
            data = await getExpensesStatistics(f, t);
            break;
          case 'reservations':
            data = await getReservationStatistics(f, t);
            break;
          case 'customers':
            data = await getCustomerStatistics(f, t);
            break;
        }
        resolvedKeys.current.add(key);
        setCache((prev) => ({
          ...prev,
          [key]: { data, from: f, to: t, error: false, loading: false },
        }));
      } catch {
        resolvedKeys.current.add(key);
        setCache((prev) => ({
          ...prev,
          [key]: { data: null, from: f, to: t, error: true, loading: false },
        }));
      } finally {
        inFlight.current.delete(key);
      }
    },
    [],
  );

  // ─── Range change ────────────────────────────────────────────────────────────

  function handleRangeChange(next: { preset: RangePreset; from: string; to: string }) {
    setPreset(next.preset);
    setFrom(next.from);
    setTo(next.to);
    pushURL(next.preset, next.from, next.to, activeTab);
    fetchTab(activeTab, next.from, next.to);
  }

  // ─── Tab change ──────────────────────────────────────────────────────────────

  function handleTabChange(tab: StatTab) {
    setActiveTab(tab);
    pushURL(preset, from, to, tab);
    fetchTab(tab, from, to);
  }

  // ─── Resolve active cache entry ──────────────────────────────────────────────

  const key = cacheKey(activeTab, from, to);
  const entry = cache[key];

  // ─── Panel placeholder renderer ─────────────────────────────────────────────
  // B5–B8: Replace each case body with the real panel component.
  // e.g. case 'sales': return <SalesStatPanel data={entry.data as SalesStatistics} />;

  function renderPanel() {
    if (!entry || entry.loading || isPending) return <StatsPanelSkeleton />;

    if (entry.error) {
      const retryKey = cacheKey(activeTab, from, to);
      function handleRetry() {
        // Remove the resolved key so fetchTab treats it as unfetched, then fetch.
        resolvedKeys.current.delete(retryKey);
        inFlight.current.delete(retryKey);
        setCache((prev) => {
          const next = { ...prev };
          delete next[retryKey];
          return next;
        });
        fetchTab(activeTab, from, to);
      }
      return (
        <div className="flex flex-col items-center gap-3">
          <EmptyState
            icon={AlertCircle}
            title="데이터를 불러오지 못했어요"
            description="잠시 후 다시 시도해 주세요."
          />
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            다시 시도
          </Button>
        </div>
      );
    }

    if (entry.data === null) {
      return (
        <EmptyState
          icon={BarChart2}
          title="데이터가 없어요"
          description="선택한 기간에 해당하는 데이터가 없습니다."
        />
      );
    }

    switch (activeTab) {
      case 'sales':
        return <SalesStatPanel data={entry.data as SalesStatistics} />;

      case 'expenses':
        return <ExpenseStatPanel data={entry.data as ExpensesStatistics} />;

      case 'reservations':
        return <ReservationStatPanel data={entry.data as ReservationStatistics} />;

      case 'customers':
        return <CustomerStatPanel data={entry.data as CustomerStatistics} />;
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Global date range selector */}
      <DateRangeSelector
        preset={preset}
        from={from}
        to={to}
        onChange={handleRangeChange}
      />

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="통계 탭"
        className="flex gap-1 border-b border-border"
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            id={`stats-tab-${t.value}`}
            aria-controls={`stats-panel-${t.value}`}
            aria-selected={activeTab === t.value}
            type="button"
            onClick={() => handleTabChange(t.value)}
            className={[
              'px-3.5 pb-2.5 pt-1.5 text-sm font-semibold leading-none border-b-2 -mb-px',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              activeTab === t.value
                ? 'border-[var(--brand)] text-[var(--brand)]'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div
        role="tabpanel"
        id={`stats-panel-${activeTab}`}
        aria-labelledby={`stats-tab-${activeTab}`}
      >
        {renderPanel()}
      </div>
    </div>
  );
}
