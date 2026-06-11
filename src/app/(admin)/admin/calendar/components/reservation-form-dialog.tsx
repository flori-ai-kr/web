'use client';

import {BellRing, Loader2, Plus, X} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {DatePicker} from '@/components/ui/date-picker';
import {Label} from '@/components/ui/label';
import {SuggestionInput} from '@/components/ui/suggestion-input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {cn, formatPhoneNumber} from '@/lib/utils';
import {CustomerAutocomplete} from '@/components/sales/CustomerAutocomplete';
import type {PaymentMethod as PaymentMethodType, SaleCategory, SaleChannel} from '@/lib/actions/sale-settings';
import {TimeSelect} from './time-select';
import type {useReservationForm} from '../hooks/use-reservation-form';

function formatCurrency(amount: number): string {
  if (!amount) return '';
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

/**
 * 예약 등록/수정 모달. 상태·제출 로직은 use-reservation-form 훅이 보유한다.
 */
export function ReservationFormDialog({
  form,
  saleCategories,
  saleChannels,
  salePaymentMethods,
}: {
  form: ReturnType<typeof useReservationForm>;
  saleCategories: SaleCategory[];
  saleChannels: SaleChannel[];
  salePaymentMethods: PaymentMethodType[];
}) {
  const {
    showForm,
    editingId,
    editingSaleId,
    formData,
    setFormData,
    pickups,
    suggestions,
    isSaving,
    totalAmount,
    resetForm,
    updatePickup,
    addPickup,
    removePickup,
    handleSubmit,
  } = form;

  return (
    <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editingId ? '예약 수정' : '새 예약'}</DialogTitle>
        </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* 고객명 | 전화번호 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">고객명 <span className="text-brand">*</span></Label>
                <CustomerAutocomplete
                  value={formData.customer_name}
                  onChange={(name, _customerId, phone) => {
                    setFormData({
                      ...formData,
                      customer_name: name,
                      customer_phone: phone || formData.customer_phone,
                    });
                  }}
                  placeholder="홍길동"
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">전화번호 <span className="text-brand">*</span></Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: formatPhoneNumber(e.target.value) })}
                  placeholder="010-0000-0000"
                  className="h-8"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* 카테고리 | 제목 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">카테고리 {!editingId && <span className="text-brand">*</span>}</Label>
                <select
                  value={formData.product_category}
                  onChange={(e) => {
                    const cat = saleCategories.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      product_category: e.target.value,
                      title: cat ? cat.label : formData.title,
                    });
                  }}
                  className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-base md:text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                  aria-label="상품 카테고리"
                >
                  <option value="">선택</option>
                  {saleCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">제목 <span className="text-brand">*</span></Label>
                <SuggestionInput
                  value={formData.title}
                  onChange={(val) => setFormData({ ...formData, title: val })}
                  suggestions={suggestions.titles}
                  placeholder="프로포즈 꽃다발"
                  className="h-8"
                />
              </div>
            </div>

            {/* 예약 채널 | 결제방식 */}
            {editingSaleId || !editingId ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">예약 채널</Label>
                  <select
                    value={formData.reservation_channel}
                    onChange={(e) => setFormData({ ...formData, reservation_channel: e.target.value })}
                    className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-base md:text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                    aria-label="예약 채널"
                  >
                    <option value="">선택</option>
                    {saleChannels.map((ch) => (
                      <option key={ch.id} value={ch.id}>{ch.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">결제방식 <span className="text-brand">*</span></Label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => {
                      const newMethod = e.target.value;
                      const updates: Partial<typeof formData> = { payment_method: newMethod };
                      // 미수 선택 시 결제일자를 첫 번째 픽업 일자로 동기화
                      if (newMethod === '__unpaid__' && pickups[0]?.date) {
                        updates.sale_date = pickups[0].date;
                      }
                      setFormData({ ...formData, ...updates });
                    }}
                    className="flex h-8 w-full appearance-none rounded-md border border-input bg-transparent bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-base md:text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                    aria-label="결제방식"
                  >
                    <option value="">선택</option>
                    {salePaymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.label}</option>
                    ))}
                    <option value="__unpaid__">미수(외상)</option>
                  </select>
                </div>
              </div>
            ) : null}

            {/* 결제일자 | 금액 */}
            <div className="grid grid-cols-[3fr_2fr] gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">결제일자</Label>
                <DatePicker
                  value={formData.sale_date}
                  onChange={(d) => setFormData({ ...formData, sale_date: d })}
                  aria-label="결제일자"
                />
              </div>
              {pickups.length === 1 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">금액 <span className="text-brand">*</span></Label>
                  <Input
                    type="number"
                    step={10000}
                    value={pickups[0].amount}
                    onChange={(e) => updatePickup(0, 'amount', e.target.value)}
                    placeholder="0"
                    className="h-8"
                    aria-label="금액"
                  />
                </div>
              )}
            </div>

            {/* 픽업 섹션 */}
            <div className="space-y-2">
              {pickups.map((pickup, idx) => (
                <div key={idx} className={cn('space-y-2', pickups.length > 1 && 'p-2.5 rounded-md border border-dashed border-input')}>
                  {pickups.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">픽업 {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removePickup(idx)}
                        className="text-[10px] text-muted-foreground hover:text-danger transition-colors"
                        aria-label={`픽업 ${idx + 1} 삭제`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="grid grid-cols-[3fr_2fr] gap-2">
                      <Label className="text-[10px] text-muted-foreground">{pickups.length === 1 ? '픽업 일자' : '날짜'} <span className="text-brand">*</span></Label>
                      <Label className="text-[10px] text-muted-foreground">{pickups.length === 1 ? '픽업 시간' : '시간'}</Label>
                    </div>
                    <div className="grid grid-cols-[3fr_2fr] gap-2">
                      <DatePicker
                        value={pickup.date}
                        onChange={(d) => updatePickup(idx, 'date', d)}
                        aria-label={`픽업 ${idx + 1} 날짜`}
                      />
                      <TimeSelect
                        value={pickup.time}
                        onChange={(val) => updatePickup(idx, 'time', val)}
                      />
                    </div>
                  </div>
                  {pickups.length > 1 && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">금액 <span className="text-brand">*</span></Label>
                      <Input
                        type="number"
                        step={10000}
                        value={pickup.amount}
                        onChange={(e) => updatePickup(idx, 'amount', e.target.value)}
                        placeholder="0"
                        className="h-8 w-full"
                        aria-label={`픽업 ${idx + 1} 금액`}
                      />
                    </div>
                  )}
                  {/* 리마인더 */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">
                      <BellRing className="w-3 h-3 inline mr-0.5" />
                      리마인더
                    </Label>
                    <div className="grid grid-cols-[3fr_2fr] gap-2">
                      <DatePicker
                        value={pickup.reminder_date}
                        onChange={(d) => updatePickup(idx, 'reminder_date', d)}
                        placeholder="없음"
                        aria-label={`픽업 ${idx + 1} 리마인더 날짜`}
                      />
                      <TimeSelect
                        value={pickup.reminder_time}
                        onChange={(val) => updatePickup(idx, 'reminder_time', val)}
                        disabled={!pickup.reminder_date}
                      />
                    </div>
                    {pickup.reminder_date && (
                      <p className="text-[10px] text-muted-foreground">
                        {pickup.reminder_date} {pickup.reminder_time || '08:00'}에 알림
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addPickup}
                className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-input rounded-md hover:bg-muted transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                픽업 추가
              </button>
              {pickups.length > 1 && (
                <div className="flex items-center justify-between px-1 pt-1">
                  <span className="text-xs text-muted-foreground">합산 금액</span>
                  <span className={cn('text-sm font-semibold', totalAmount > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                    {totalAmount > 0 ? formatCurrency(totalAmount) : '0원'}
                  </span>
                </div>
              )}
            </div>

            {/* 메모 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground">메모</Label>
                <span className="text-[11px] text-muted-foreground">
                  {formData.memo.length}/200
                </span>
              </div>
              <SuggestionInput
                value={formData.memo}
                onChange={(val) => setFormData({ ...formData, memo: val })}
                suggestions={suggestions.memos}
                placeholder="메모를 입력하세요"
                maxLength={200}
                multiline
                aria-label="메모"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9" onClick={resetForm}>
                취소
              </Button>
              <Button type="submit" size="sm" className="flex-1 h-9" disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editingId ? '수정' : '등록'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
