'use server';

import {requireAuth} from '@/lib/auth-guard';
import {PhotoCard, PhotoFile} from '@/types/database';
import {idSchema, photoCardSchema, validateImageMeta} from '@/lib/validations';
import {AppError, ErrorCode, withErrorLogging} from '@/lib/errors';
import {apiFetch} from '@/lib/api/client';

const MAX_PHOTOS_PER_CARD = 10;

// ─── Kotlin DTO 미러 (camelCase) ───────────────────────────────
// Kotlin은 camelCase로 직렬화한다. 웹 타입(snake_case)으로 매핑한다.

interface PhotoFileDto {
  url: string;
  originalName: string;
}

interface PhotoCardDto {
  id: string;
  title: string;
  memo: string | null;
  tags: string[];
  photos: PhotoFileDto[];
  saleId: string | null;
  customerId: number | string | null;
  customerName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PhotoCardsPageDto {
  cards: PhotoCardDto[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCards: number;
  totalPhotos: number;
}

interface UploadTargetDto {
  uploadUrl: string;
  fileUrl: string;
  originalName: string;
}

interface PhotoDownloadDto {
  downloadUrl: string;
}

/** Kotlin PhotoCardResponse(camelCase) → 웹 PhotoCard(snake_case) 매핑. */
function toPhotoCard(dto: PhotoCardDto): PhotoCard {
  return {
    id: dto.id,
    // user_id는 멀티테넌시상 서버에서만 사용되며 모든 클라이언트가 무시한다 (안전한 기본값)
    user_id: '',
    title: dto.title,
    memo: dto.memo,
    tags: dto.tags || [],
    photos: dto.photos || [],
    sale_id: dto.saleId,
    customer_id: dto.customerId != null ? String(dto.customerId) : null,
    customer_name: dto.customerName ?? null,
    created_at: dto.createdAt,
    updated_at: dto.updatedAt,
  };
}

export interface PhotoCardsResponse {
  cards: PhotoCard[];
  nextCursor: string | null;
  hasMore: boolean;
  // 상단 요약 헤더용 — 현재 필터 기준 전체 카드 수·전체 사진 장수(페이지 무관).
  totalCards: number;
  totalPhotos: number;
}

async function _getPhotoCards(
  tag?: string,
  cursor?: string,
  customerId?: string,
  from?: string,
  to?: string
): Promise<PhotoCardsResponse> {
  await requireAuth();

  if (customerId) {
    const parsed = idSchema.safeParse(customerId);
    if (!parsed.success) {
      throw new AppError(ErrorCode.VALIDATION, '잘못된 고객 ID 형식입니다');
    }
  }

  const params = new URLSearchParams();
  if (tag) params.append('tag', tag);
  if (cursor) params.append('cursor', cursor);
  if (customerId) params.append('customerId', customerId);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const qs = params.toString();

  const dto = await apiFetch<PhotoCardsPageDto>(`/photo-cards${qs ? `?${qs}` : ''}`);

  return {
    cards: dto.cards.map(toPhotoCard),
    nextCursor: dto.nextCursor,
    hasMore: dto.hasMore,
    totalCards: dto.totalCards ?? dto.cards.length,
    totalPhotos: dto.totalPhotos ?? 0,
  };
}

export const getPhotoCards = withErrorLogging('getPhotoCards', _getPhotoCards);

async function _getPhotoCardById(id: string): Promise<PhotoCard | null> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const dto = await apiFetch<PhotoCardDto>(`/photo-cards/${id}`);
  return toPhotoCard(dto);
}

export const getPhotoCardById = withErrorLogging('getPhotoCardById', _getPhotoCardById);

async function _createPhotoCard(formData: FormData): Promise<PhotoCard> {
  await requireAuth();

  const title = formData.get('title') as string;
  const memo = formData.get('memo') as string | null;
  const tagsJson = formData.get('tags') as string;
  const photosJson = formData.get('photos') as string;
  const saleId = formData.get('sale_id') as string | null;
  const customerId = formData.get('customer_id') as string | null;

  let tags: string[];
  let photos: PhotoFile[];
  try {
    tags = tagsJson ? JSON.parse(tagsJson) : [];
    photos = photosJson ? JSON.parse(photosJson) : [];
  } catch {
    throw new AppError(ErrorCode.VALIDATION, '태그 또는 사진 데이터 형식이 올바르지 않습니다');
  }

  const parsed = photoCardSchema.safeParse({
    title: title?.trim(),
    memo: memo?.trim() || null,
    tags,
    photos,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // 고객 연결: 값이 있으면 검증 후 연결, 비어 있으면 null(미연결).
  let customerIdNum: number | null = null;
  if (customerId) {
    const customerParsed = idSchema.safeParse(customerId);
    if (!customerParsed.success) {
      throw new AppError(ErrorCode.VALIDATION, '잘못된 고객 ID 형식입니다');
    }
    customerIdNum = Number(customerParsed.data);
  }

  const dto = await apiFetch<PhotoCardDto>('/photo-cards', {
    method: 'POST',
    body: JSON.stringify({
      title: parsed.data.title,
      memo: parsed.data.memo || null,
      tags: parsed.data.tags || [],
      photos: parsed.data.photos || [],
      saleId: saleId || null,
      customerId: customerIdNum,
    }),
  });

  return toPhotoCard(dto);
}

export const createPhotoCard = withErrorLogging('createPhotoCard', _createPhotoCard);

async function _updatePhotoCard(id: string, formData: FormData): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const title = formData.get('title') as string;
  const memo = formData.get('memo') as string | null;
  const tagsJson = formData.get('tags') as string;
  const photosJson = formData.get('photos') as string;
  const saleId = formData.get('sale_id') as string | null;
  const customerId = formData.get('customer_id') as string | null;

  let tags: string[];
  let photos: PhotoFile[];
  try {
    tags = tagsJson ? JSON.parse(tagsJson) : [];
    photos = photosJson ? JSON.parse(photosJson) : [];
  } catch {
    throw new AppError(ErrorCode.VALIDATION, '태그 또는 사진 데이터 형식이 올바르지 않습니다');
  }

  const parsed = photoCardSchema.safeParse({
    title: title?.trim(),
    memo: memo?.trim() || null,
    tags,
    photos,
  });
  if (!parsed.success) {
    throw new AppError(ErrorCode.VALIDATION, `입력값이 올바르지 않습니다: ${parsed.error.issues[0]?.message}`);
  }

  // 고객 연결: 값이 있으면 검증 후 연결, 진짜로 비어 있을 때만 연결 해제(clearCustomer).
  // 수정 모달은 기존 고객을 미리 선택해 두므로, 사용자가 직접 비우지 않는 한 customerId가 유지된다.
  let customerLink: { customerId: number } | { clearCustomer: true };
  if (customerId) {
    const customerParsed = idSchema.safeParse(customerId);
    if (!customerParsed.success) {
      throw new AppError(ErrorCode.VALIDATION, '잘못된 고객 ID 형식입니다');
    }
    customerLink = { customerId: Number(customerParsed.data) };
  } else {
    customerLink = { clearCustomer: true };
  }

  await apiFetch<PhotoCardDto>(`/photo-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: parsed.data.title,
      memo: parsed.data.memo || null,
      tags: parsed.data.tags || [],
      photos: parsed.data.photos || [],
      saleId: saleId || null,
      ...customerLink,
    }),
  });
}

export const updatePhotoCard = withErrorLogging('updatePhotoCard', _updatePhotoCard);

async function _deletePhotoCard(id: string): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  // BFF가 DB 레코드와 S3 객체를 함께 정리한다
  await apiFetch<void>(`/photo-cards/${id}`, {
    method: 'DELETE',
  });
}

export const deletePhotoCard = withErrorLogging('deletePhotoCard', _deletePhotoCard);


async function _createPhotoUploadTargets(
  cardId: string,
  files: { name: string; type: string; size: number }[],
): Promise<{ uploadUrl: string; publicUrl: string; originalName: string }[]> {
  await requireAuth();
  const idParsed = idSchema.safeParse(cardId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  // 앱 레이어 사전 검증(서버도 검증하지만 빠른 실패 + 한국어 메시지 일관성)
  if (files.length > MAX_PHOTOS_PER_CARD) {
    throw new AppError(ErrorCode.VALIDATION, `사진은 최대 ${MAX_PHOTOS_PER_CARD}장까지 등록할 수 있습니다.`);
  }
  for (const file of files) {
    const imageError = validateImageMeta(file);
    if (imageError) throw new AppError(ErrorCode.VALIDATION, imageError);
  }

  // Kotlin이 소유권·최대 10장·이미지 메타 검증 후 presigned PUT URL을 발급한다
  const targets = await apiFetch<UploadTargetDto[]>(`/photo-cards/${cardId}/upload-targets`, {
    method: 'POST',
    body: JSON.stringify({
      files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    }),
  });

  return targets.map((t) => ({
    uploadUrl: t.uploadUrl,
    publicUrl: t.fileUrl,
    originalName: t.originalName,
  }));
}

export const createPhotoUploadTargets = withErrorLogging('createPhotoUploadTargets', _createPhotoUploadTargets);

/**
 * 카드 생성 전(신규) presigned PUT URL 발급. 카드 id가 없으므로 userId 기준 키로 발급된다.
 * 업로드를 먼저 끝낸 뒤 imageUrls를 담아 카드를 생성하면, 업로드 실패 시 DB에 카드가 남지 않는다.
 */
async function _createPhotoUploadTargetsStandalone(
  files: { name: string; type: string; size: number }[],
): Promise<{ uploadUrl: string; publicUrl: string; originalName: string }[]> {
  await requireAuth();

  if (files.length > MAX_PHOTOS_PER_CARD) {
    throw new AppError(ErrorCode.VALIDATION, `사진은 최대 ${MAX_PHOTOS_PER_CARD}장까지 등록할 수 있습니다.`);
  }
  for (const file of files) {
    const imageError = validateImageMeta(file);
    if (imageError) throw new AppError(ErrorCode.VALIDATION, imageError);
  }

  const targets = await apiFetch<UploadTargetDto[]>('/photo-cards/upload-targets', {
    method: 'POST',
    body: JSON.stringify({
      files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
    }),
  });

  return targets.map((t) => ({
    uploadUrl: t.uploadUrl,
    publicUrl: t.fileUrl,
    originalName: t.originalName,
  }));
}

export const createPhotoUploadTargetsStandalone = withErrorLogging(
  'createPhotoUploadTargetsStandalone',
  _createPhotoUploadTargetsStandalone,
);

async function _deletePhoto(cardId: string, photoUrl: string): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(cardId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  // BFF가 photos 배열에서 URL을 제거하고 S3 객체도 함께 삭제한다
  await apiFetch<PhotoCardDto>(`/photo-cards/${cardId}/photos?url=${encodeURIComponent(photoUrl)}`, {
    method: 'DELETE',
  });
}

export const deletePhoto = withErrorLogging('deletePhoto', _deletePhoto);

async function _reorderPhotos(cardId: string, photos: PhotoFile[]): Promise<void> {
  await requireAuth();
  const idParsed = idSchema.safeParse(cardId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  await apiFetch<PhotoCardDto>(`/photo-cards/${cardId}/photos/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({
      photos: photos.map((p) => ({ url: p.url, originalName: p.originalName })),
    }),
  });
}

export const reorderPhotos = withErrorLogging('reorderPhotos', _reorderPhotos);


async function _downloadPhoto(
  cardId: string,
  photo: PhotoFile,
): Promise<{ url: string; filename: string } | null> {
  await requireAuth();
  const idParsed = idSchema.safeParse(cardId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  try {
    // BFF가 소유권 검증 후 서명된 다운로드 URL(presigned GET)을 발급한다
    const dto = await apiFetch<PhotoDownloadDto>(
      `/photo-cards/${cardId}/photos/download?url=${encodeURIComponent(photo.url)}`,
    );
    if (!dto?.downloadUrl) return null;

    return {
      url: dto.downloadUrl,
      filename: photo.originalName,
    };
  } catch {
    return null;
  }
}

export const downloadPhoto = withErrorLogging('downloadPhoto', _downloadPhoto);

async function _downloadAllPhotos(cardId: string): Promise<{ urls: Array<{ url: string; filename: string }> }> {
  await requireAuth();
  const idParsed = idSchema.safeParse(cardId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  const dto = await apiFetch<PhotoCardDto>(`/photo-cards/${cardId}`);
  const photos = dto.photos || [];
  if (!photos.length) {
    return { urls: [] };
  }

  const results = await Promise.all(
    photos.map((photo) => downloadPhoto(cardId, { url: photo.url, originalName: photo.originalName })),
  );
  const downloadUrls = results.filter((r): r is { url: string; filename: string } => r !== null);

  return { urls: downloadUrls };
}

export const downloadAllPhotos = withErrorLogging('downloadAllPhotos', _downloadAllPhotos);


async function _getPhotoCardBySaleId(saleId: string): Promise<PhotoCard | null> {
  await requireAuth();
  const idParsed = idSchema.safeParse(saleId);
  if (!idParsed.success) throw new AppError(ErrorCode.VALIDATION, 'ID 형식이 올바르지 않습니다');

  // 카드 없으면 204 No Content → apiFetch가 undefined 반환
  const dto = await apiFetch<PhotoCardDto | undefined>(`/photo-cards/by-sale/${saleId}`);
  if (!dto) return null;
  return toPhotoCard(dto);
}

export const getPhotoCardBySaleId = withErrorLogging('getPhotoCardBySaleId', _getPhotoCardBySaleId);

// @MX:WARN: [AUTO] saleIds 길이만큼 by-sale 엔드포인트를 병렬 호출한다 (N개 요청)
// @MX:REASON: Kotlin에 sale_id 일괄 조회 엔드포인트가 없어 단건 조회로 대체했다. 페이지당
//   매출 수(통상 8~50)만큼 동시 요청이 발생하므로, 추후 일괄 엔드포인트 추가 시 단일 호출로 교체해야 한다.
async function _getSaleIdsWithPhotos(saleIds: string[]): Promise<string[]> {
  if (saleIds.length === 0) return [];
  await requireAuth();

  // 사일별 카드 존재 여부 조회: by-sale 엔드포인트를 병렬 조회한다.
  // (Kotlin에 일괄 조회 엔드포인트가 없어 sale_id 단건 조회로 대체)
  const results = await Promise.all(
    saleIds.map(async (saleId) => {
      const dto = await apiFetch<PhotoCardDto | undefined>(`/photo-cards/by-sale/${saleId}`);
      return dto ? saleId : null;
    }),
  );

  return results.filter((s): s is string => s !== null);
}

export const getSaleIdsWithPhotos = withErrorLogging('getSaleIdsWithPhotos', _getSaleIdsWithPhotos);

async function _createOrUpdatePhotoCardForSale(
  saleId: string,
  title: string,
  photos: PhotoFile[],
  memo?: string | null,
  tags?: string[]
): Promise<PhotoCard> {
  await requireAuth();

  const photoPayload = photos.map((p) => ({ url: p.url, originalName: p.originalName }));

  // 기존 카드 존재 여부 확인
  const existingCard = await getPhotoCardBySaleId(saleId);

  if (existingCard) {
    const dto = await apiFetch<PhotoCardDto>(`/photo-cards/${existingCard.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title,
        photos: photoPayload,
        ...(memo !== undefined && { memo }),
        ...(tags !== undefined && { tags }),
      }),
    });
    return toPhotoCard(dto);
  }

  const dto = await apiFetch<PhotoCardDto>('/photo-cards', {
    method: 'POST',
    body: JSON.stringify({
      title,
      memo: memo || null,
      tags: tags || [],
      photos: photoPayload,
      saleId,
    }),
  });
  return toPhotoCard(dto);
}

export const createOrUpdatePhotoCardForSale = withErrorLogging('createOrUpdatePhotoCardForSale', _createOrUpdatePhotoCardForSale);
