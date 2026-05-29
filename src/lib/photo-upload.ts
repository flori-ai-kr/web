import {createPhotoUploadTargets, createPhotoUploadTargetsStandalone} from '@/lib/actions/photo-cards';
import {PhotoFile} from '@/types/database';

/**
 * 카드 생성 전(신규) presigned PUT 발급 → 브라우저에서 S3로 직접 업로드.
 * 업로드를 먼저 끝내고 그 결과(PhotoFile[])로 카드를 생성하면, 업로드 실패 시 DB에 카드가 안 남는다.
 * 입력 순서를 보존한다.
 */
export async function uploadPhotoFilesStandalone(files: File[]): Promise<PhotoFile[]> {
  const targets = await createPhotoUploadTargetsStandalone(
    files.map((file) => ({ name: file.name, type: file.type, size: file.size })),
  );

  await Promise.all(
    targets.map((t, i) =>
      fetch(t.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': files[i].type || 'image/jpeg' },
        body: files[i],
      }).then((res) => {
        if (!res.ok) throw new Error('이미지 업로드에 실패했습니다');
      }),
    ),
  );

  return targets.map((t) => ({ url: t.publicUrl, originalName: t.originalName }));
}

/**
 * presigned PUT URL을 발급받아 브라우저에서 R2로 직접 업로드한다.
 * Vercel Server Action 본문 4.5MB 제한을 우회하기 위한 경로.
 * 입력 순서대로 PhotoFile[]을 반환한다 (순서 보존).
 */
export async function uploadPhotoFiles(
  cardId: string,
  files: File[],
): Promise<PhotoFile[]> {
  const targets = await createPhotoUploadTargets(
    cardId,
    files.map((file) => ({ name: file.name, type: file.type, size: file.size })),
  );

  await Promise.all(
    targets.map((t, i) =>
      fetch(t.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': files[i].type || 'image/jpeg' },
        body: files[i],
      }).then((res) => {
        if (!res.ok) throw new Error('이미지 업로드에 실패했습니다');
      }),
    ),
  );

  return targets.map((t) => ({ url: t.publicUrl, originalName: t.originalName }));
}
