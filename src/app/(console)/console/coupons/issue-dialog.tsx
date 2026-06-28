'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { issueCoupon } from '@/lib/actions/admin-coupons';
import {
  COUPON_SOURCES as SOURCE_OPTIONS,
  COUPON_SOURCE_LABELS,
  type CouponSource,
} from './coupon-labels';

export function IssueDialog({
  open,
  onOpenChange,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: () => void;
}) {
  const [codeMode, setCodeMode] = useState<'auto' | 'manual'>('auto');
  const [code, setCode] = useState('');
  const [days, setDays] = useState('');
  const [source, setSource] = useState<CouponSource>('PROMO');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [memo, setMemo] = useState('');
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setCodeMode('auto');
    setCode('');
    setDays('');
    setSource('PROMO');
    setValidFrom('');
    setValidUntil('');
    setMaxRedemptions('');
    setMemo('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    const daysNum = parseInt(days, 10);
    if (!days || isNaN(daysNum) || daysNum < 1) {
      toast.error('무료 일수를 1 이상으로 입력하세요');
      return;
    }

    if (codeMode === 'manual' && !code.trim()) {
      toast.error('쿠폰 코드를 입력하세요');
      return;
    }

    startTransition(async () => {
      try {
        await issueCoupon({
          code: codeMode === 'manual' ? code.trim() : undefined,
          days: daysNum,
          source,
          // DatePicker는 yyyy-MM-dd 를 주지만 api(CouponIssueRequest)는 Instant 기대 → ISO 변환.
          // 시작일=그날 0시(UTC), 종료일=그날 끝(23:59:59Z)까지 유효(선택한 날 내내 사용 가능).
          validFrom: validFrom ? `${validFrom}T00:00:00Z` : null,
          validUntil: validUntil ? `${validUntil}T23:59:59Z` : null,
          maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
          memo: memo.trim() || null,
        });
        toast.success('쿠폰이 발행되었습니다');
        reset();
        onOpenChange(false);
        onIssued();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '발행 실패');
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>쿠폰 발행</DialogTitle>
          <DialogDescription>무료 일수를 부여하는 쿠폰을 발행합니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 코드 설정 */}
          <div className="space-y-2">
            <Label>쿠폰 코드</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="codeMode"
                  value="auto"
                  checked={codeMode === 'auto'}
                  onChange={() => setCodeMode('auto')}
                  className="accent-brand"
                />
                자동 생성
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="codeMode"
                  value="manual"
                  checked={codeMode === 'manual'}
                  onChange={() => setCodeMode('manual')}
                  className="accent-brand"
                />
                직접 입력
              </label>
            </div>
            {codeMode === 'manual' && (
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="예: SUMMER2026"
                className="font-mono uppercase"
              />
            )}
          </div>

          {/* 무료 일수 */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-days">무료 일수 *</Label>
            <Input
              id="cp-days"
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="예: 30"
            />
          </div>

          {/* 용도 */}
          <div className="space-y-1.5">
            <Label>용도 *</Label>
            <Select value={source} onValueChange={(v) => setSource(v as CouponSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {COUPON_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 등록 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>시작일</Label>
              <DatePicker
                value={validFrom}
                onChange={setValidFrom}
                placeholder="선택 안 함"
                aria-label="유효 시작일"
              />
            </div>
            <div className="space-y-1.5">
              <Label>종료일</Label>
              <DatePicker
                value={validUntil}
                onChange={setValidUntil}
                placeholder="선택 안 함"
                minDate={validFrom || undefined}
                aria-label="유효 종료일"
              />
            </div>
          </div>

          {/* 총 발급 한도 */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-max">총 발급 한도</Label>
            <Input
              id="cp-max"
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="비워두면 무제한"
            />
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-memo">메모</Label>
            <Textarea
              id="cp-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="내부 참고용 메모 (선택)"
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              발행
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
