import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { RecurringExpense } from '@/types/database';

// Cron 보안: CRON_SECRET (timing-safe)
function verifyCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${cronSecret}`;
  if (authHeader && authHeader.length === expected.length) {
    if (timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) return true;
  }
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

function todayKST(): Date {
  // KST = UTC+9. cron 실행 시각이 UTC라 보정.
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(kstMs);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function fmtISO(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function lastDayOfMonth(year: number, monthZero: number): number {
  return new Date(Date.UTC(year, monthZero + 1, 0)).getUTCDate();
}

function isDueToday(r: RecurringExpense, today: Date): boolean {
  const startDate = new Date(r.start_date + 'T00:00:00Z');
  if (today < startDate) return false;
  if (r.end_date && today > new Date(r.end_date + 'T00:00:00Z')) return false;

  if (r.frequency === 'weekly') {
    const dows = r.days_of_week ?? [];
    if (!dows.includes(today.getUTCDay())) return false;
    const weeks = Math.floor((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return weeks % (r.interval_count || 1) === 0;
  }

  if (r.frequency === 'monthly') {
    const doms = r.days_of_month ?? [];
    const last = lastDayOfMonth(today.getUTCFullYear(), today.getUTCMonth());
    // 사용자가 설정한 날짜 중 today와 매칭되는지 (clamping 고려)
    const todayDate = today.getUTCDate();
    const matches = doms.some(d => Math.min(d, last) === todayDate);
    if (!matches) return false;
    const months = (today.getUTCFullYear() - startDate.getUTCFullYear()) * 12
                 + (today.getUTCMonth() - startDate.getUTCMonth());
    return months >= 0 && months % (r.interval_count || 1) === 0;
  }

  if (r.frequency === 'yearly') {
    const dates = r.yearly_dates ?? [];
    const matches = dates.some(yd => {
      const monthZero = yd.m - 1;
      if (today.getUTCMonth() !== monthZero) return false;
      const last = lastDayOfMonth(today.getUTCFullYear(), monthZero);
      return today.getUTCDate() === Math.min(yd.d, last);
    });
    if (!matches) return false;
    const years = today.getUTCFullYear() - startDate.getUTCFullYear();
    return years >= 0 && years % (r.interval_count || 1) === 0;
  }

  return false;
}

export async function GET(request: Request) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase 환경변수 누락' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const today = todayKST();
  const todayISO = fmtISO(today);

  // 활성 템플릿 전체
  const { data: rules, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = (rules ?? []).filter(r => isDueToday(r as RecurringExpense, today));
  if (due.length === 0) {
    return NextResponse.json({ ok: true, today: todayISO, processed: 0 });
  }

  // skip 체크: 같은 (recurring_id, today) skip 있으면 제외
  const recurringIds = due.map(r => r.id);
  const { data: skips } = await supabase
    .from('recurring_skips')
    .select('recurring_id')
    .in('recurring_id', recurringIds)
    .eq('skip_date', todayISO);
  const skipSet = new Set((skips ?? []).map(s => s.recurring_id));

  const rows = due
    .filter(r => !skipSet.has(r.id))
    .map(r => ({
      user_id: r.user_id,
      date: todayISO,
      item_name: r.item_name,
      category: r.category,
      unit_price: r.unit_price,
      quantity: r.quantity,
      total_amount: r.unit_price * r.quantity,
      payment_method: r.payment_method,
      vendor: r.vendor,
      note: r.note,
      recurring_id: r.id,
      is_recurring_modified: false,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, today: todayISO, processed: 0, skipped: due.length });
  }

  // (recurring_id, date) UNIQUE 인덱스로 중복 자동 무시
  const { data: inserted, error: insErr } = await supabase
    .from('expenses')
    .upsert(rows, { onConflict: 'recurring_id,date', ignoreDuplicates: true })
    .select('id');

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    today: todayISO,
    due: due.length,
    inserted: inserted?.length ?? 0,
  });
}
