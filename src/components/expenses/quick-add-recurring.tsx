'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Zap, Settings as SettingsIcon } from 'lucide-react';
import { getRecurringExpenses, quickAddFromRecurring } from '@/lib/actions/recurring-expenses';
import type { RecurringExpense } from '@/types/database';

export function QuickAddRecurring() {
  const router = useRouter();
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    getRecurringExpenses()
      .then(list => setItems(list.filter(r => r.is_active)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (r: RecurringExpense) => {
    setBusyId(r.id);
    try {
      await quickAddFromRecurring(r.id);
      toast.success(`${r.item_name} 지출이 추가되었습니다`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '추가에 실패했습니다');
    } finally {
      setBusyId(null);
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">고정비 빠른 추가</span>
        <Link
          href="/admin/settings"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <SettingsIcon className="w-3 h-3" />관리
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => handleAdd(r)}
            disabled={busyId === r.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-background hover:bg-accent text-xs transition-colors disabled:opacity-50"
          >
            <span className="font-medium">{r.item_name}</span>
            <span className="text-muted-foreground">₩{(r.unit_price * r.quantity).toLocaleString()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
