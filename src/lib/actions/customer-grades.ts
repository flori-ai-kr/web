'use server';

import {revalidatePath} from 'next/cache';
import {requireAuth} from '@/lib/auth-guard';
import type {CustomerGradeConfig} from '@/types/database';
import {
  customerGradeConfigCreateSchema,
  customerGradeConfigUpdateSchema,
  idSchema,
} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

// Kotlin /customer-grades 응답 (camelCase). 서버 계약과 1:1.
interface KotlinCustomerGrade {
  id: string | number;
  name: string;
  threshold: number | null;
  sortOrder: number;
}

// camelCase(Kotlin) → snake_case(웹 CustomerGradeConfig) 매핑.
// 멀티테넌시는 서버 JWT(TenantContext)가 처리한다.
function mapGrade(g: KotlinCustomerGrade): CustomerGradeConfig {
  return {
    id: String(g.id),
    name: g.name,
    threshold: g.threshold ?? null,
    sort_order: g.sortOrder,
  };
}

async function _getCustomerGrades(): Promise<CustomerGradeConfig[]> {
  await requireAuth();
  const grades = await apiFetch<KotlinCustomerGrade[]>('/customer-grades');
  return grades.map(mapGrade);
}

export const getCustomerGrades = withErrorLogging('getCustomerGrades', _getCustomerGrades);

async function _createCustomerGradeConfig(input: { name: string; threshold: number | null }) {
  await requireAuth();

  const parsed = customerGradeConfigCreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  const created = await apiFetch<KotlinCustomerGrade>('/customer-grades', {
    method: 'POST',
    body: JSON.stringify({
      name: parsed.data.name,
      threshold: parsed.data.threshold,
    }),
  });

  revalidatePath('/admin/customers');
  return mapGrade(created);
}

export const createCustomerGradeConfig = withErrorLogging('createCustomerGradeConfig', _createCustomerGradeConfig);

async function _updateCustomerGradeConfig(
  id: string,
  input: { name?: string; threshold?: number | null; clearThreshold?: boolean },
) {
  await requireAuth();

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const parsed = customerGradeConfigUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // 제공된 필드만 PATCH 본문에 포함한다 (서버가 미지정 필드는 미반영)
  const body: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) body.name = parsed.data.name;
  if (parsed.data.threshold !== undefined) body.threshold = parsed.data.threshold;
  if (parsed.data.clearThreshold !== undefined) body.clearThreshold = parsed.data.clearThreshold;

  const updated = await apiFetch<KotlinCustomerGrade>(`/customer-grades/${idParsed.data}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  revalidatePath('/admin/customers');
  return mapGrade(updated);
}

export const updateCustomerGradeConfig = withErrorLogging('updateCustomerGradeConfig', _updateCustomerGradeConfig);

// 임계값 변경 미리보기 — 저장 없이, 이 변경으로 등급이 바뀔 고객 목록을 받는다.
export interface GradeChangePreviewItem {
  customer_name: string;
  from_grade: string | null;
  to_grade: string;
}
export interface GradeRecomputePreview {
  total: number;
  changes: GradeChangePreviewItem[];
}
interface KotlinGradePreview {
  total: number;
  changes: { customerName: string; fromGrade: string | null; toGrade: string }[];
}

async function _previewGradeThresholdChange(
  id: string,
  input: { threshold?: number | null; clearThreshold?: boolean },
): Promise<GradeRecomputePreview> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  const res = await apiFetch<KotlinGradePreview>(`/customer-grades/${idParsed.data}/preview`, {
    method: 'POST',
    body: JSON.stringify({
      threshold: input.clearThreshold ? null : input.threshold ?? null,
      clearThreshold: input.clearThreshold ?? false,
    }),
  });
  return {
    total: res.total,
    changes: res.changes.map((c) => ({
      customer_name: c.customerName,
      from_grade: c.fromGrade,
      to_grade: c.toGrade,
    })),
  };
}

export const previewGradeThresholdChange = withErrorLogging(
  'previewGradeThresholdChange',
  _previewGradeThresholdChange,
);

async function _deleteCustomerGradeConfig(id: string) {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, '올바르지 않은 ID입니다');

  await apiFetch<void>(`/customer-grades/${idParsed.data}`, { method: 'DELETE' });

  revalidatePath('/admin/customers');
}

export const deleteCustomerGradeConfig = withErrorLogging('deleteCustomerGradeConfig', _deleteCustomerGradeConfig);
