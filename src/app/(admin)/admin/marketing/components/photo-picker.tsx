'use client';

import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {Check, ImagePlus, Loader2, Upload, X} from 'lucide-react';
import {toast} from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {getPhotoCards} from '@/lib/actions/photo-cards';
import {uploadPhotoFilesStandalone} from '@/lib/photo-upload';
import {validateImageFile} from '@/lib/validations';
import {cn} from '@/lib/utils';

const MAX_PHOTOS = 4;

interface PhotoPickerProps {
  /** 현재 선택된 사진 URL 목록(부모 폼이 소유). */
  selected: string[];
  onChange: (urls: string[]) => void;
}

/**
 * 블로그 초안용 사진 선택(0~4장). 두 경로:
 *  ① 사진첩(갤러리)에서 기존 사진 선택 — getPhotoCards로 최근 사진 로드
 *  ② 새 이미지 업로드 — presigned S3 업로드 후 공개 URL 사용(ai-server SSRF 가드는 공개 http(s)만 허용)
 * 선택된 사진은 칩 썸네일로 보여주고 개별 제거 가능.
 */
export function PhotoPicker({selected, onChange}: PhotoPickerProps) {
  const [open, setOpen] = useState(false);

  function remove(url: string) {
    onChange(selected.filter((u) => u !== url));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.map((url) => (
          <div
            key={url}
            className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-muted"
          >
            <Image src={url} alt="선택한 사진" fill sizes="64px" className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="사진 제거"
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {selected.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-brand hover:text-brand"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[10px] font-medium">사진</span>
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        사진은 선택 사항이에요. 최대 {MAX_PHOTOS}장까지 — 사진첩에서 고르거나 새로 올릴 수 있어요.
      </p>

      <PhotoPickerDialog
        open={open}
        onOpenChange={setOpen}
        selected={selected}
        remaining={MAX_PHOTOS - selected.length}
        onConfirm={(urls) => onChange([...selected, ...urls].slice(0, MAX_PHOTOS))}
      />
    </div>
  );
}

interface PhotoPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string[];
  remaining: number;
  onConfirm: (urls: string[]) => void;
}

function PhotoPickerDialog({open, onOpenChange, selected, remaining, onConfirm}: PhotoPickerDialogProps) {
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    // setState를 effect 본문에서 동기 호출하지 않도록 비동기 함수로 감싼다(cascading render 방지).
    const load = async () => {
      setLoading(true);
      setPicked([]);
      try {
        const res = await getPhotoCards();
        const urls = res.cards.flatMap((c) => c.photos.map((p) => p.url)).slice(0, 60);
        if (active) setGalleryUrls(urls);
      } catch {
        toast.error('사진첩을 불러오지 못했어요.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [open]);

  function toggle(url: string) {
    setPicked((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= remaining) {
        toast.error(`사진은 최대 ${remaining}장 더 선택할 수 있어요.`);
        return prev;
      }
      return [...prev, url];
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, remaining - picked.length);
    if (inputRef.current) inputRef.current.value = '';
    if (files.length === 0) return;
    for (const f of files) {
      const invalid = validateImageFile(f);
      if (invalid) {
        toast.error(invalid);
        return;
      }
    }
    setUploading(true);
    try {
      const uploaded = await uploadPhotoFilesStandalone(files);
      const urls = uploaded.map((u) => u.url).filter((u) => !selected.includes(u));
      onConfirm(urls.slice(0, remaining));
      onOpenChange(false);
    } catch {
      toast.error('사진 업로드에 실패했어요.');
    } finally {
      setUploading(false);
    }
  }

  function confirm() {
    if (picked.length > 0) onConfirm(picked);
    onOpenChange(false);
  }

  const available = galleryUrls.filter((u) => !selected.includes(u));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>사진 선택</DialogTitle>
          <DialogDescription>
            사진첩에서 고르거나 새 사진을 올려보세요. {remaining}장까지 추가할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            새 사진 올리기
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={onUpload}
          />

          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">사진첩에서 선택</p>
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : available.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                사진첩에 사용할 수 있는 사진이 없어요. 새 사진을 올려보세요.
              </p>
            ) : (
              <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
                {available.map((url) => {
                  const isPicked = picked.includes(url);
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => toggle(url)}
                      aria-pressed={isPicked}
                      className={cn(
                        'relative aspect-square overflow-hidden rounded-lg border-2 transition-colors',
                        isPicked ? 'border-brand' : 'border-transparent hover:border-border',
                      )}
                    >
                      <Image src={url} alt="사진첩 사진" fill sizes="120px" className="object-cover" unoptimized />
                      {isPicked && (
                        <span className="absolute inset-0 flex items-center justify-center bg-brand/30">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" variant="brand" size="sm" onClick={confirm} disabled={picked.length === 0}>
            {picked.length > 0 ? `${picked.length}장 추가` : '선택'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
