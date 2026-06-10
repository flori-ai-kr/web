'use server';

import {requireAuth} from '@/lib/auth-guard';
import {PhotoTag} from '@/types/database';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {idSchema} from '@/lib/validations';
import {apiFetch} from '@/lib/api/client';

// ─── Kotlin DTO 미러 (camelCase) ───────────────────────────────

interface PhotoTagDto {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

/** Kotlin PhotoTagResponse(camelCase) → 웹 PhotoTag(snake_case) 매핑. */
function toPhotoTag(dto: PhotoTagDto): PhotoTag {
  return {
    id: dto.id,
    name: dto.name,
    color: dto.color,
    created_at: dto.createdAt,
  };
}

async function _getPhotoTags(): Promise<PhotoTag[]> {
  await requireAuth();

  const dtos = await apiFetch<PhotoTagDto[]>('/photo-tags');
  return (dtos || []).map(toPhotoTag);
}

export const getPhotoTags = withErrorLogging('getPhotoTags', _getPhotoTags);

async function _createPhotoTag(name: string, color?: string): Promise<PhotoTag | null> {
  await requireAuth();

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new AppError(ErrorCode.VALIDATION, '태그 이름을 입력해주세요');
  }

  // 색상 미지정 시 서버가 랜덤 색상을 부여한다.
  // 중복은 서버가 409 + "이미 존재하는 태그입니다" 메시지로 응답하고,
  // apiFetch가 그 메시지를 담은 AppError로 던져 그대로 전파한다.
  const dto = await apiFetch<PhotoTagDto>('/photo-tags', {
    method: 'POST',
    body: JSON.stringify({ name: trimmedName, color: color ?? null }),
  });
  return toPhotoTag(dto);
}

export const createPhotoTag = withErrorLogging('createPhotoTag', _createPhotoTag);

async function _updatePhotoTag(id: string, name: string, color: string): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new AppError(ErrorCode.VALIDATION, '태그 이름을 입력해주세요');
  }

  // 중복은 서버 409 메시지를 apiFetch가 AppError로 전파한다 (위 create와 동일)
  await apiFetch<PhotoTagDto>(`/photo-tags/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: trimmedName, color }),
  });
}

export const updatePhotoTag = withErrorLogging('updatePhotoTag', _updatePhotoTag);

async function _deletePhotoTag(id: string): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  // 서버가 삭제 + 모든 카드 tags 배열에서 cascade 제거(array_remove)한다.
  await apiFetch<void>(`/photo-tags/${id}`, { method: 'DELETE' });
}

export const deletePhotoTag = withErrorLogging('deletePhotoTag', _deletePhotoTag);
