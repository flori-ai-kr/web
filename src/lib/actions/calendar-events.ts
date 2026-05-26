'use server';

import { requireAuth } from '@/lib/auth-guard';
import type { CalendarEvent } from '@/types/database';
import { calendarEventSchema, calendarEventBaseSchema, uuidSchema } from '@/lib/validations';
import { withErrorLogging, AppError, ErrorCode } from '@/lib/errors';
import { apiFetch } from '@/lib/api/client';

// Kotlin /calendar-events 응답 (camelCase). 서버 계약과 1:1.
interface KotlinCalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// camelCase(Kotlin) → snake_case(웹 CalendarEvent 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
function mapKotlinCalendarEvent(e: KotlinCalendarEvent): CalendarEvent {
  return {
    id: e.id,
    user_id: '',
    title: e.title,
    start_date: e.startDate,
    end_date: e.endDate,
    color: e.color,
    description: e.description,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

async function _getCalendarEvents(month: string): Promise<CalendarEvent[]> {
  await requireAuth();

  // 월 범위와 겹치는 이벤트 조회는 서버(/calendar-events?month=)가 처리한다.
  const params = new URLSearchParams();
  params.set('month', month);

  const events = await apiFetch<KotlinCalendarEvent[]>(`/calendar-events?${params.toString()}`);
  return events.map(mapKotlinCalendarEvent);
}

export const getCalendarEvents = withErrorLogging('getCalendarEvents', _getCalendarEvents);

async function _createCalendarEvent(formData: {
  title: string;
  start_date: string;
  end_date: string;
  color?: string;
  description?: string;
}): Promise<CalendarEvent> {
  await requireAuth();

  const parsed = calendarEventSchema.safeParse(formData);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const created = await apiFetch<KotlinCalendarEvent>('/calendar-events', {
    method: 'POST',
    body: JSON.stringify({
      title: parsed.data.title,
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      color: parsed.data.color || '#f43f5e',
      description: parsed.data.description || null,
    }),
  });

  return mapKotlinCalendarEvent(created);
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

  // 제공된(non-undefined) 필드만 PATCH 본문에 포함한다.
  const body: Record<string, string | null> = {};
  if (parsed.data.title !== undefined) body.title = parsed.data.title;
  if (parsed.data.start_date !== undefined) body.startDate = parsed.data.start_date;
  if (parsed.data.end_date !== undefined) body.endDate = parsed.data.end_date;
  if (parsed.data.color !== undefined) body.color = parsed.data.color;
  if (parsed.data.description !== undefined) body.description = parsed.data.description;

  await apiFetch<KotlinCalendarEvent>(`/calendar-events/${idParsed.data}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export const updateCalendarEvent = withErrorLogging('updateCalendarEvent', _updateCalendarEvent);

async function _deleteCalendarEvent(id: string): Promise<void> {
  await requireAuth();
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');
  await apiFetch<void>(`/calendar-events/${idParsed.data}`, { method: 'DELETE' });
}

export const deleteCalendarEvent = withErrorLogging('deleteCalendarEvent', _deleteCalendarEvent);
