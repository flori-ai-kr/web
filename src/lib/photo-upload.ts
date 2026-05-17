import { createPhotoUploadTargets } from '@/lib/actions/photo-cards';
import { PhotoFile } from '@/types/database';

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
