'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {Check, ChevronLeft, Image as ImageIcon, ImagePlus, Images, Loader2, Upload, X} from 'lucide-react';
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
import {ImageWithSkeleton} from '@/components/ui/image-with-skeleton';
import {getPhotoCards} from '@/lib/actions/photo-cards';
import {uploadPhotoFilesStandalone} from '@/lib/photo-upload';
import {validateImageFile} from '@/lib/validations';
import type {PhotoCard} from '@/types/database';
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

/**
 * 2단 선택: ① 사진첩처럼 등록일순 카드(폴더) 그리드(스크롤 더보기) → ② 카드를 탭하면 그 카드 안의
 * 사진 중에서 선택. 폴더를 넘나들며 누적 선택(총 remaining 장)할 수 있고, 상단에 'N/remaining 선택' 표시.
 */
function PhotoPickerDialog({open, onOpenChange, selected, remaining, onConfirm}: PhotoPickerDialogProps) {
  const [cards, setCards] = useState<PhotoCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 열릴 때마다 초기화 + 첫 페이지 로드.
  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setPicked([]);
      setActiveCardId(null);
      setCards([]);
      setCursor(null);
      setHasMore(false);
      try {
        const res = await getPhotoCards();
        if (!active) return;
        setCards(res.cards);
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } catch {
        if (active) toast.error('사진첩을 불러오지 못했어요.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [open]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await getPhotoCards(undefined, cursor);
      setCards((prev) => [...prev, ...res.cards]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      toast.error('더 불러오지 못했어요.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, cursor]);

  // 카드 목록(레벨1)에서만 무한 스크롤 — 스크롤 컨테이너를 root 로 sentinel 관찰.
  useEffect(() => {
    if (activeCardId || !hasMore) return;
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      {root, rootMargin: '120px'},
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [activeCardId, hasMore, loadMore]);

  function toggle(url: string) {
    setPicked((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= remaining) {
        toast.error(`사진은 ${remaining}장까지 더 선택할 수 있어요.`);
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

  const activeCard = activeCardId ? cards.find((c) => c.id === activeCardId) ?? null : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>사진 선택</DialogTitle>
          <DialogDescription>
            {activeCard
              ? '사진을 눌러 선택하세요. 폴더를 넘나들며 고를 수 있어요.'
              : `폴더를 열어 고르거나 새 사진을 올려보세요. ${remaining}장까지 추가할 수 있어요.`}
          </DialogDescription>
        </DialogHeader>

        {/* 액션바: (레벨2)뒤로 / (레벨1)업로드 + 선택 카운터 */}
        <div className="flex items-center justify-between gap-2">
          {activeCard ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-1 gap-1 px-2"
              onClick={() => setActiveCardId(null)}
            >
              <ChevronLeft className="h-4 w-4" />
              사진첩
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              새 사진 올리기
            </Button>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {picked.length}/{remaining} 선택
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={onUpload}
        />

        <div ref={scrollRef} className="max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeCard ? (
            // ── 레벨2: 선택한 카드 내부 사진 ──
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {activeCard.photos.map((p) => {
                const already = selected.includes(p.url);
                const isPicked = picked.includes(p.url);
                return (
                  <button
                    key={p.url}
                    type="button"
                    disabled={already}
                    onClick={() => toggle(p.url)}
                    aria-pressed={isPicked}
                    className={cn(
                      'block overflow-hidden rounded-lg border-2 transition-colors',
                      isPicked ? 'border-brand' : 'border-transparent hover:border-border',
                      already && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {/* iOS WebKit은 <button>에 aspect-ratio를 적용하지 않아 셀이 0높이로 붕괴(겹침). aspect 박스를 내부 span으로 분리. */}
                    <span className="relative block aspect-square">
                      <ImageWithSkeleton src={p.url} alt="사진첩 사진" fill sizes="120px" className="object-cover" />
                      {(isPicked || already) && (
                        <span className="absolute inset-0 flex items-center justify-center bg-brand/30">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : cards.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              사진첩에 사용할 수 있는 사진이 없어요. 새 사진을 올려보세요.
            </p>
          ) : (
            // ── 레벨1: 사진첩 카드(폴더) 그리드 ──
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {cards.map((card) => {
                  const cover = card.photos[0];
                  const pickedInCard = card.photos.filter((p) => picked.includes(p.url)).length;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setActiveCardId(card.id)}
                      className="group block overflow-hidden rounded-xl border border-border bg-muted text-left"
                      aria-label={`${card.title} 폴더 열기`}
                    >
                      <span className="relative block aspect-square">
                        {cover ? (
                          <ImageWithSkeleton
                            src={cover.url}
                            alt={card.title}
                            fill
                            sizes="(max-width: 640px) 50vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/40" aria-hidden />
                          </span>
                        )}
                        {card.photos.length > 1 && (
                          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            <Images className="h-3 w-3" aria-hidden />
                            {card.photos.length}
                          </span>
                        )}
                        {pickedInCard > 0 && (
                          <span className="absolute left-1.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                            {pickedInCard}
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-5">
                          <span className="block truncate text-[11px] font-semibold text-white">{card.title}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-3">
                  <Button type="button" variant="ghost" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : '더보기'}
                  </Button>
                </div>
              )}
            </>
          )}
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
