'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-guard';
import type { CalendarEvent } from '@/types/database';
import { calendarEventSchema, calendarEventBaseSchema, uuidSchema } from '@/lib/validations';
import { withErrorLogging, AppError, ErrorCode } from '@/lib/errors';
import { getMonthDateRange } from '@/lib/utils';

async function _getCalendarEvents(month: string): Promise<CalendarEvent[]> {
  await requireAuth();
  const supabase = await createClient();
  const { startDate, endDate } = getMonthDateRange(month);

  // 월 범위와 겹치는 이벤트: start_date <= 월말 AND end_date >= 월초
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .lte('start_date', endDate)
    .gte('end_date', startDate)
    .order('start_date')
    .order('id');

  if (error) throw error;
  return (data || []) as CalendarEvent[];
}

export const getCalendarEvents = withErrorLogging('getCalendarEvents', _getCalendarEvents);

async function _createCalendarEvent(formData: {
  title: string;
  start_date: string;
  end_date: string;
  color?: string;
  description?: string;
}): Promise<CalendarEvent> {
  const user = await requireAuth();

  const parsed = calendarEventSchema.safeParse(formData);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      color: parsed.data.color || '#f43f5e',
      description: parsed.data.description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CalendarEvent;
}

export const createCalendarEvent = withErrorLogging('createCalendarEvent', _createCalendarEvent);

async function _updateCalendarEvent(
  id: string,
  formData: {
    title?: string;
    start_date?: string;
    end_date?: string;
    color?: string;
    description?: string | null;
  }
): Promise<void> {
  await requireAuth();

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const parsed = calendarEventBaseSchema.partial().safeParse(formData);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // 날짜 범위 검증 (둘 다 있을 때)
  if (parsed.data.start_date && parsed.data.end_date && parsed.data.end_date < parsed.data.start_date) {
    throw new AppError(ErrorCode.VALIDATION, '종료일은 시작일보다 이전일 수 없습니다');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('calendar_events')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export const updateCalendarEvent = withErrorLogging('updateCalendarEvent', _updateCalendarEvent);

async function _deleteCalendarEvent(id: string): Promise<void> {
  await requireAuth();
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');
  const supabase = await createClient();
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
}

export const deleteCalendarEvent = withErrorLogging('deleteCalendarEvent', _deleteCalendarEvent);
