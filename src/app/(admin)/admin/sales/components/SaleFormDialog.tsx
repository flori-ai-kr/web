'use client';

import {useEffect, useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {AmountInput} from '@/components/ui/amount-input';
import {SuggestionInput} from '@/components/ui/suggestion-input';
import {CustomerAutocomplete} from '@/components/sales/CustomerAutocomplete';
import {Loader2} from 'lucide-react';
import {format} from 'date-fns';
import {toast} from 'sonner';
import {cn, formatPhoneNumber} from '@/lib/utils';
import {createSale, getSaleSuggestions, updateSale} from '@/lib/actions/sales';
import type {Sale} from '@/types/database';
import type {PaymentMethod, SaleCategory, SaleChannel} from '@/lib/actions/sale-settings';

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: Sale | null;
  categories: SaleCategory[];
  payments: PaymentMethod[];
  channels: SaleChannel[];
  initialCustomer?: { name: string; id: string | null; phone: string | null };
  onSuccess: (newSale?: Sale) => void;
}

export function SaleFormDialog({
  open,
  onOpenChange,
  sale,
  categories,
  payments,
  channels,
  initialCustomer,
  onSuccess,
}: SaleFormDialogProps) {
  // '로드' 채널(있으면)의 id — 로드 구입 간편 모드에서 채널 고정에 사용
  const roadChannelId = channels.find((c) => c.value === 'road')?.id ?? '';
  const [isSubmitting, startTransition] = useTransition();
  const [amountError, setAmountError] = useState<string | null>(null);
  const [saleSuggestions, setSaleSuggestions] = useState<{ memos: string[] }>({ memos: [] });
  const [paymentMethodId, setPaymentMethodId] = useState<string>(payments[0]?.id ?? '');
  const [isUnpaid, setIsUnpaid] = useState(false);
  const [noteValue, setNoteValue] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [isRoadPurchase, setIsRoadPurchase] = useState(false);

  const isEditMode = !!sale;

  useEffect(() => {
    if (open) {
      getSaleSuggestions().then(setSaleSuggestions).catch(() => {});
    }
  }, [open]);

  // Initialize form state when dialog opens
  useEffect(() => {
    if (open) {
      setAmountError(null);
      if (sale) {
        // Edit mode
        setPaymentMethodId(sale.payment_method_id ?? (payments[0]?.id ?? ''));
        setIsUnpaid(sale.is_unpaid);
        setNoteValue(sale.memo || '');
        setCustomerName(sale.customer_name || '');
        setCustomerId(sale.customer_id || null);
        setCustomerPhone(sale.customer_phone || null);
        setIsRoadPurchase(!!roadChannelId && sale.channel_id === roadChannelId);
      } else {
        // Create mode
        setPaymentMethodId(payments[0]?.id ?? '');
        setIsUnpaid(false);
        setNoteValue('');
        setIsRoadPurchase(false);
        if (initialCustomer) {
          setCustomerName(initialCustomer.name);
          setCustomerId(initialCustomer.id);
          setCustomerPhone(initialCustomer.phone);
        } else {
          setCustomerName('');
          setCustomerId(null);
          setCustomerPhone(null);
        }
      }
    }
  }, [open, sale, payments, initialCustomer, roadChannelId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // 인라인 검증: 금액은 native required로 빈 값만 막히므로(0은 통과) 직접 검사한다.
    const amount = parseInt(formData.get('amount') as string, 10) || 0;
    if (amount <= 0) {
      setAmountError('금액을 입력해주세요');
      return;
    }
    setAmountError(null);

    startTransition(async () => {
      try {
        if (isEditMode) {
          await updateSale(sale.id, formData);
          onOpenChange(false);
          toast.success('매출이 수정되었습니다');
          onSuccess();
        } else {
          const newSale = await createSale(formData);
          onOpenChange(false);
          toast.success('매출이 등록되었습니다');
          onSuccess(newSale);
        }
      } catch (error) {
        console.error('Failed to save sale:', error);
        toast.error(isEditMode ? '매출 수정에 실패했습니다' : '매출 등록에 실패했습니다');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">{isEditMode ? '매출 수정' : '매출 등록'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid grid-cols-[3fr_2fr] gap-4">
            <div className="space-y-2">
              <Label>날짜 *</Label>
              <Input
                type="date"
                name="date"
                defaultValue={sale?.date || format(new Date(), 'yyyy-MM-dd')}
                required
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>금액 *</Label>
              <AmountInput
                name="amount"
                value={sale?.amount}
                placeholder="0"
                required
                onChange={(v) => { if (v > 0 && amountError) setAmountError(null); }}
                aria-invalid={!!amountError}
                aria-describedby={amountError ? 'sale-amount-error' : undefined}
                className={cn("bg-muted", amountError && "border-danger focus-visible:ring-danger")}
              />
              {amountError && <p id="sale-amount-error" className="text-xs text-danger">{amountError}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>상품 카테고리 *</Label>
              <button
                type="button"
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  isRoadPurchase
                    ? "bg-brand/10 text-brand border-brand ring-2 ring-offset-1 ring-brand/50"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
                onClick={() => {
                  setIsRoadPurchase(!isRoadPurchase);
                  if (!isRoadPurchase) {
                    setCustomerName('');
                    setCustomerId(null);
                    setCustomerPhone(null);
                  }
                }}
              >
                로드 구입
              </button>
            </div>
            <Select name="category_id" defaultValue={sale?.category_id ?? undefined} key={sale?.id ? `cat-${sale.id}` : 'cat-create'} required>
              <SelectTrigger className="bg-muted">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 결제방식 - 미수 토글 + 결제수단 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>결제방식 *</Label>
              <button
                type="button"
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                  isUnpaid
                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
                onClick={() => setIsUnpaid(!isUnpaid)}
              >
                미수(외상)
              </button>
            </div>
            <input type="hidden" name="payment_method_id" value={isUnpaid ? '' : paymentMethodId} />
            <input type="hidden" name="is_unpaid" value={String(isUnpaid)} />
            {isUnpaid ? (
              <p className="text-xs text-muted-foreground">미수로 등록됩니다. 결제 완료 시 결제방식을 선택해주세요.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {payments.map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                      paymentMethodId === pm.id
                        ? "bg-brand/10 text-brand border-brand ring-2 ring-offset-1 ring-brand/50"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    )}
                    onClick={() => setPaymentMethodId(pm.id)}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 예약방식 - 로드 구입이면 road 채널 고정, 아니면 선택 */}
          {isRoadPurchase ? (
            <input type="hidden" name="channel_id" value={roadChannelId} />
          ) : (
            <div className="space-y-2">
              <Label>예약방식</Label>
              <Select name="channel_id" defaultValue={sale?.channel_id ?? undefined} key={sale?.id ? `ch-${sale.id}` : 'ch-create'}>
                <SelectTrigger className="bg-muted">
                  <SelectValue placeholder="예약방식 선택" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(ch => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* 고객 정보 - 로드 구입이 아닐 때만 */}
          {!isRoadPurchase && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>주문자명</Label>
                <CustomerAutocomplete
                  value={customerName}
                  onChange={(name, id, phone) => {
                    setCustomerName(name);
                    setCustomerId(id);
                    setCustomerPhone(phone);
                  }}
                  placeholder="고객명 검색 또는 입력"
                />
              </div>
              <div className="space-y-2">
                <Label>연락처</Label>
                <Input
                  name="customer_phone"
                  value={customerPhone || ''}
                  onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))}
                  placeholder="010-0000-0000"
                  className="bg-muted"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>메모</Label>
              <span className={cn("text-xs", noteValue.length > 200 ? "text-destructive" : "text-muted-foreground")}>
                {noteValue.length}/200
              </span>
            </div>
            <SuggestionInput
              name="memo"
              value={noteValue}
              onChange={(val) => setNoteValue(val)}
              suggestions={saleSuggestions.memos}
              placeholder="메모를 입력하세요"
              maxLength={200}
              multiline
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
          <input type="hidden" name="customer_name" value={customerName} />
          <input type="hidden" name="customer_id" value={customerId || ''} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
