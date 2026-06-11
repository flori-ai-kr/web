'use client';

import {format} from 'date-fns';
import {Loader2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {AmountInput} from '@/components/ui/amount-input';
import {SuggestionInput} from '@/components/ui/suggestion-input';
import {DatePicker} from '@/components/ui/date-picker';
import {cn} from '@/lib/utils';
import type {ExpenseCategory, ExpensePaymentMethod} from '@/lib/actions/expense-settings';
import type {useExpenseForm} from '../hooks/use-expense-form';

/**
 * 지출 등록 모달. 상태·제출 로직은 use-expense-form 훅이 보유한다.
 */
export function ExpenseFormDialog({
  form,
  categories,
  payments,
}: {
  form: ReturnType<typeof useExpenseForm>;
  categories: ExpenseCategory[];
  payments: ExpensePaymentMethod[];
}) {
  const {
    isFormOpen,
    setIsFormOpen,
    isSubmitting,
    noteValue,
    setNoteValue,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    expenseSuggestions,
    createItemName,
    setCreateItemName,
    createVendor,
    setCreateVendor,
    handleSubmit,
  } = form;

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">지출 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-5 pt-2">
          <div className="grid grid-cols-[3fr_2fr] gap-4">
            <div className="space-y-2">
              <Label>날짜 *</Label>
              <DatePicker name="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
            <div className="space-y-2">
              <Label>카테고리 *</Label>
              <Select name="category_id" defaultValue={categories[0]?.id}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>물품명 *</Label>
            <SuggestionInput
              name="item_name"
              value={createItemName}
              onChange={setCreateItemName}
              suggestions={expenseSuggestions.itemNames}
              placeholder="예: 장미 50송이, 배달비"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>단가 *</Label>
              <AmountInput name="unit_price" placeholder="0" required />
            </div>
            <div className="space-y-2">
              <Label>수량</Label>
              <Input type="number" name="quantity" defaultValue="1" min="1" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2.5">총액은 단가 x 수량으로 자동 계산돼요.</p>
          <div className="space-y-2">
            <Label>결제방식 *</Label>
            <input type="hidden" name="payment_method_id" value={selectedPaymentMethod} />
            <div className="flex flex-wrap gap-2">
              {payments.map(pm => (
                <button
                  key={pm.id}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    selectedPaymentMethod === pm.id
                      ? "bg-brand/10 text-brand border-brand ring-2 ring-offset-1 ring-brand/50"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  )}
                  onClick={() => setSelectedPaymentMethod(pm.id)}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>거래처</Label>
            <SuggestionInput
              name="vendor"
              value={createVendor}
              onChange={setCreateVendor}
              suggestions={expenseSuggestions.vendors}
              placeholder="예: 고속터미널 꽃시장"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>메모</Label>
              <span className={cn("text-xs", noteValue.length > 200 ? "text-danger" : "text-muted-foreground")}>
                {noteValue.length}/200
              </span>
            </div>
            <SuggestionInput
              name="memo"
              value={noteValue}
              onChange={setNoteValue}
              suggestions={expenseSuggestions.memos}
              placeholder="메모를 입력하세요"
              maxLength={200}
              multiline
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
