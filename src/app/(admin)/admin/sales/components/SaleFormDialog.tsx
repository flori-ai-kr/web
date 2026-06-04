'use client';

import {useEffect, useState} from 'react';
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
import type {PaymentMethod, SaleCategory} from '@/lib/actions/sale-settings';

interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: Sale | null;
  categories: SaleCategory[];
  payments: PaymentMethod[];
  initialCustomer?: { name: string; id: string | null; phone: string | null };
  onSuccess: (newSale?: Sale) => void;
}

export function SaleFormDialog({
  open,
  onOpenChange,
  sale,
  categories,
  payments,
  initialCustomer,
  onSuccess,
}: SaleFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [saleSuggestions, setSaleSuggestions] = useState<{ notes: string[] }>({ notes: [] });
  const [paymentMethod, setPaymentMethod] = useState<string>(payments[0]?.value || 'card');
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
        setPaymentMethod(sale.payment_method);
        setNoteValue(sale.note || '');
        setCustomerName(sale.customer_name || '');
        setCustomerId(sale.customer_id || null);
        setCustomerPhone(sale.customer_phone || null);
        setIsRoadPurchase(sale.reservation_channel === 'road');
      } else {
        // Create mode
        setPaymentMethod(payments[0]?.value || 'card');
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
  }, [open, sale, payments, initialCustomer]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // 인라인 검증: 금액은 native required로 빈 값만 막히므로(0은 통과) 직접 검사한다.
    const amount = parseInt(formData.get('amount') as string, 10) || 0;
    if (amount <= 0) {
      setAmountError('금액을 입력해주세요');
      return;
    }
    setAmountError(null);

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">{isEditMode ? '매출 수정' : '매출 등록'}</DialogTitle>
          {!isEditMode && (
            <p className="text-sm text-muted-foreground">오늘 판매한 내역을 입력해주세요. * 표시는 필수 항목이에요.</p>
          )}
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
            <Select name="product_category" defaultValue={sale?.product_category} key={sale?.id ? `cat-${sale.id}` : 'cat-create'} required>
              <SelectTrigger className="bg-muted">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* 결제방식 - 항상 표시 */}
          <div className="space-y-2">
            <Label>결제방식 *</Label>
            <input type="hidden" name="payment_method" value={paymentMethod} />
            <div className="flex flex-wrap gap-2">
              {payments.map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    paymentMethod === pm.value
                      ? "ring-2 ring-offset-1 ring-brand/50"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  )}
                  style={paymentMethod === pm.value ? { backgroundColor: `${pm.color}20`, color: pm.color, borderColor: pm.color } : {}}
                  onClick={() => setPaymentMethod(pm.value)}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>
          {/* 예약방식 - 로드 구입이면 road 고정, 아니면 선택 */}
          {isRoadPurchase ? (
            <input type="hidden" name="reservation_channel" value="road" />
          ) : (
            <div className="space-y-2">
              <Label>예약방식</Label>
              <Select name="reservation_channel" defaultValue={sale?.reservation_channel || 'naver_booking'} key={sale?.id ? `ch-${sale.id}` : 'ch-create'}>
                <SelectTrigger className="bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">전화</SelectItem>
                  <SelectItem value="kakaotalk">카카오톡</SelectItem>
                  <SelectItem value="naver_booking">네이버예약</SelectItem>
                  <SelectItem value="road">로드</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
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
                {!isEditMode && (
                  <p className="text-[11px] text-muted-foreground">이름을 입력하면 기존 고객이 자동 검색돼요</p>
                )}
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
              <Label>비고</Label>
              <span className={cn("text-xs", noteValue.length > 100 ? "text-destructive" : "text-muted-foreground")}>
                {noteValue.length}/100
              </span>
            </div>
            <SuggestionInput
              name="note"
              value={noteValue}
              onChange={(val) => setNoteValue(val)}
              suggestions={saleSuggestions.notes}
              placeholder="추가 정보를 입력하세요"
              maxLength={100}
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
