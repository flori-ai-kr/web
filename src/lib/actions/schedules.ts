'use server';

import {requireAuth} from '@/lib/auth-guard';
import type {Schedule} from '@/types/database';
import {scheduleBaseSchema, scheduleSchema, idSchema} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

interface KotlinSchedule {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

// camelCase(Kotlin) → snake_case(웹 Schedule 타입) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리하므로 user_id는 비운다(뷰에서 미사용).
function mapKotlinSchedule(e: KotlinSchedule): Schedule {
  return {
    id: e.id,
    user_id: '',
    title: e.title,
    start_date: e.startDate,
    end_date: e.endDate,
    color: e.color,
    memo: e.memo,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

async function _getSchedules(month: string): Promise<Schedule[]> {
  await requireAuth();

  // 월 범위와 겹치는 이벤트 조회는 서버(/schedules?month=)가 처리한다.
  const params = new URLSearchParams();
  params.set('month', month);

  const events = await apiFetch<KotlinSchedule[]>(`/schedules?${params.toString()}`);
  return events.map(mapKotlinSchedule);
}

export const getSchedules = withErrorLogging('getSchedules', _getSchedules);

async function _createSchedule(formData: {
  title: string;
  start_date: string;
  end_date: string;
  color?: string;
  memo?: string;
}): Promise<Schedule> {
  await requireAuth();

  const parsed = scheduleSchema.safeParse(formData);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const created = await apiFetch<KotlinSchedule>('/schedules', {
    method: 'POST',
    body: JSON.stringify({
      title: parsed.data.title,
      startDate: parsed.data.start_date,
      endDate: parsed.data.end_date,
      color: parsed.data.color || '#f43f5e',
      memo: parsed.data.memo || null,
    }),
  });

  return mapKotlinSchedule(created);
}

export const createSchedule = withErrorLogging('createSchedule', _createSchedule);

async function _updateSchedule(
  id: string,
  formData: {
    title?: string;
    start_date?: string;
    end_date?: string;
    color?: string;
    memo?: string | null;
  }
): Promise<void> {
  await requireAuth();

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const parsed = scheduleBaseSchema.partial().safeParse(formData);
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
  if (parsed.data.memo !== undefined) body.memo = parsed.data.memo;

  await apiFetch<KotlinSchedule>(`/schedules/${idParsed.data}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export const updateSchedule = withErrorLogging('updateSchedule', _updateSchedule);

async function _deleteSchedule(id: string): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');
  await apiFetch<void>(`/schedules/${idParsed.data}`, { method: 'DELETE' });
}

export const deleteSchedule = withErrorLogging('deleteSchedule', _deleteSchedule);
