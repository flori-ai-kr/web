'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
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
import { DatePicker } from '@/components/ui/date-picker';
import { updateCoupon } from '@/lib/actions/admin-coupons';
import type { CouponResponse } from '@/types/billing';
import { couponSourceLabel } from '../coupon-labels';

export function EditDialog({
  open,
  onOpenChange,
  coupon,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: CouponResponse;
  onUpdated: () => void;
}) {
  const [days, setDays] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [memo, setMemo] = useState('');
  const [pending, startTransition] = useTransition();

  // 다이얼로그가 열릴 때(또는 대상 쿠폰이 바뀔 때) 현재 값으로 프리필.
  // DatePicker/Instant 값은 yyyy-MM-dd 로 잘라 controlled value 에 맞춘다.
  useEffect(() => {
    if (!open) return;
    setDays(String(coupon.days));
    setValidFrom(coupon.validFrom ? coupon.validFrom.slice(0, 10) : '');
    setValidUntil(coupon.validUntil ? coupon.validUntil.slice(0, 10) : '');
    setMaxRedemptions(coupon.maxRedemptions != null ? String(coupon.maxRedemptions) : '');
    setMemo(coupon.memo ?? '');
  }, [open, coupon]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    const daysNum = parseInt(days, 10);
    if (!days || isNaN(daysNum) || daysNum < 1) {
      toast.error('무료 일수를 1 이상으로 입력하세요');
      return;
    }

    startTransition(async () => {
      try {
        await updateCoupon(coupon.id, {
          days: daysNum,
          // DatePicker는 yyyy-MM-dd 를 주지만 api 는 Instant 기대 → ISO 변환.
          // 시작일=그날 0시(UTC), 종료일=그날 끝(23:59:59Z)까지 유효.
          validFrom: validFrom ? `${validFrom}T00:00:00Z` : null,
          validUntil: validUntil ? `${validUntil}T23:59:59Z` : null,
          maxRedemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
          memo: memo.trim() || null,
        });
        toast.success('쿠폰이 수정되었습니다');
        onOpenChange(false);
        onUpdated();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '수정 실패');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>쿠폰 수정</DialogTitle>
          <DialogDescription>
            코드와 용도는 변경할 수 없습니다. 나머지 조건을 수정합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 코드 (읽기 전용) */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-edit-code">쿠폰 코드</Label>
            <Input
              id="cp-edit-code"
              value={coupon.code}
              disabled
              readOnly
              className="font-mono uppercase"
            />
          </div>

          {/* 용도 (읽기 전용) */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-edit-source">용도</Label>
            <Input
              id="cp-edit-source"
              value={couponSourceLabel(coupon.source)}
              disabled
              readOnly
            />
          </div>

          {/* 무료 일수 */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-edit-days">무료 일수 *</Label>
            <Input
              id="cp-edit-days"
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="예: 30"
            />
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
            <Label htmlFor="cp-edit-max">총 발급 한도</Label>
            <Input
              id="cp-edit-max"
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="비워두면 무제한"
            />
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-edit-memo">메모</Label>
            <Textarea
              id="cp-edit-memo"
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
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
