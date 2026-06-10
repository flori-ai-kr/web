'use client';

import {useRef, useState} from 'react';
import {Check, Flower2, ImagePlus, Loader2, RotateCcw} from 'lucide-react';
import {toast} from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {uploadPhotoFilesStandalone} from '@/lib/photo-upload';
import {validateImageFile} from '@/lib/validations';
import {confirmAiProposal, proposeReservationFromImage} from '@/lib/actions/ai';
import {AppError} from '@/lib/errors';
import type {AiConfirmationCard} from '@/types/ai';

// OCR→예약 (B, human-in-loop). 카톡/주문 스크린샷 → 비전 LLM 추출 → 확인 카드 → 사용자가
// "예약 생성"을 눌러야 confirm 경유로 실제 예약이 만들어진다. LLM 단독 쓰기 없음.
// 흐름: 이미지 선택 → presigned S3 업로드(공개 URL) → /ocr/reservation → 카드 → /confirm.

type Phase = 'select' | 'working' | 'review' | 'confirming';

export function OcrReservationButton({onCreated}: {onCreated?: () => void}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('select');
  const [card, setCard] = useState<AiConfirmationCard | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPhase('select');
    setCard(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error(invalid);
      reset();
      return;
    }
    setPhase('working');
    try {
      // 1) presigned 업로드 → 공개 URL (AI 서버 SSRF 가드는 공개 http(s)만 허용)
      const [uploaded] = await uploadPhotoFilesStandalone([file]);
      // 2) 비전 추출 → 확인 카드
      const draft = await proposeReservationFromImage(uploaded.url);
      setCard(draft);
      setPhase('review');
    } catch (err) {
      const msg = err instanceof AppError ? err.message : '이미지에서 예약 정보를 읽지 못했어요.';
      toast.error(msg);
      reset();
    }
  }

  async function confirm() {
    if (!card) return;
    setPhase('confirming');
    try {
      await confirmAiProposal(card.proposalId);
      toast.success('예약이 생성되었어요.');
      setOpen(false);
      reset();
      onCreated?.();
    } catch (err) {
      const msg = err instanceof AppError ? err.message : '예약 생성에 실패했어요.';
      toast.error(msg);
      setPhase('review'); // 카드 유지 — 다시 시도 가능
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ImagePlus className="h-4 w-4" />
          이미지로 예약 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{background: 'linear-gradient(135deg,var(--ai-grad-from),var(--ai-grad-to))'}}
              aria-hidden="true"
            >
              <Flower2 className="h-3.5 w-3.5 text-white" />
            </span>
            이미지로 예약 추가
          </DialogTitle>
          <DialogDescription>
            카톡 대화·주문 스크린샷을 올리면 AI가 예약 초안을 만들어요. 확인 후 생성됩니다.
          </DialogDescription>
        </DialogHeader>

        {/* 입력/작업 단계 */}
        {(phase === 'select' || phase === 'working') && (
          <div className="py-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={phase === 'working'}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors duration-150 hover:border-brand hover:bg-brand-muted/30 disabled:opacity-60"
            >
              {phase === 'working' ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  <span className="text-[13px] text-muted-foreground">이미지를 분석하고 있어요…</span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-brand" />
                  <span className="text-[13px] font-medium text-foreground">이미지 선택</span>
                  <span className="text-[11px] text-muted-foreground">JPG·PNG·WEBP · 최대 5MB</span>
                </>
              )}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={onPick}
            />
          </div>
        )}

        {/* 확인 카드 단계 */}
        {(phase === 'review' || phase === 'confirming') && card && (
          <div className="py-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[13px] font-semibold text-foreground">{card.summary}</p>
              <dl className="mt-3 space-y-1.5">
                {card.fields.map((f, i) => (
                  <div key={i} className="flex gap-3 text-[13px]">
                    <dt className="w-14 shrink-0 text-muted-foreground">{f.label}</dt>
                    <dd className="flex-1 text-foreground">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              내용이 맞는지 확인해 주세요. 생성을 누르면 예약이 등록돼요.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {(phase === 'review' || phase === 'confirming') && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reset}
                disabled={phase === 'confirming'}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                다른 이미지
              </Button>
              <Button
                type="button"
                variant="brand"
                size="sm"
                onClick={confirm}
                disabled={phase === 'confirming'}
                className="gap-1.5"
              >
                {phase === 'confirming' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                예약 생성
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
