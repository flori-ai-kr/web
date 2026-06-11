'use client';

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
 * 지출 수정 모달 + 고정비 자동생성 건의 '이것만/이후 모두' 분기 모달.
 */
export function ExpenseEditDialog({
  form,
  categories,
  payments,
}: {
  form: ReturnType<typeof useExpenseForm>;
  categories: ExpenseCategory[];
  payments: ExpensePaymentMethod[];
}) {
  const {
    editingExpense,
    setEditingExpense,
    isSubmitting,
    editNoteValue,
    setEditNoteValue,
    editPaymentMethod,
    setEditPaymentMethod,
    pendingScopeEdit,
    setPendingScopeEdit,
    scopeBusy,
    expenseSuggestions,
    editItemName,
    setEditItemName,
    editVendor,
    setEditVendor,
    handleUpdate,
    handleScopeEditConfirm,
  } = form;

  return (
    <>
      {/* Edit Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl">지출 수정</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(e); }} className="space-y-5 pt-2">
              <div className="grid grid-cols-[3fr_2fr] gap-4">
                <div className="space-y-2">
                  <Label>날짜 *</Label>
                  <DatePicker name="date" defaultValue={editingExpense.date} required />
                </div>
                <div className="space-y-2">
                  <Label>카테고리 *</Label>
                  <Select name="category_id" defaultValue={editingExpense.category_id ?? undefined} key={`cat-${editingExpense.id}`}>
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
                  value={editItemName}
                  onChange={setEditItemName}
                  suggestions={expenseSuggestions.itemNames}
                  placeholder="물품명"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>단가 *</Label>
                  <AmountInput name="unit_price" value={editingExpense.unit_price} required />
                </div>
                <div className="space-y-2">
                  <Label>수량</Label>
                  <Input type="number" name="quantity" defaultValue={editingExpense.quantity} min="1" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2.5">총액은 단가 x 수량으로 자동 계산돼요.</p>
              <div className="space-y-2">
                <Label>결제방식 *</Label>
                <input type="hidden" name="payment_method_id" value={editPaymentMethod} />
                <div className="flex flex-wrap gap-2">
                  {payments.map(pm => (
                    <button
                      key={pm.id}
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                        editPaymentMethod === pm.id
                          ? "bg-brand/10 text-brand border-brand ring-2 ring-offset-1 ring-brand/50"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      )}
                      onClick={() => setEditPaymentMethod(pm.id)}
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
                  value={editVendor}
                  onChange={setEditVendor}
                  suggestions={expenseSuggestions.vendors}
                  placeholder="거래처명"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>메모</Label>
                  <span className={cn("text-xs", editNoteValue.length > 200 ? "text-danger" : "text-muted-foreground")}>
                    {editNoteValue.length}/200
                  </span>
                </div>
                <SuggestionInput
                  name="memo"
                  value={editNoteValue}
                  onChange={setEditNoteValue}
                  suggestions={expenseSuggestions.memos}
                  placeholder="메모를 입력하세요"
                  maxLength={200}
                  multiline
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingExpense(null)}>취소</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 자동생성된 지출 수정 — 이것만 / 이후 모두 분기 */}
      <Dialog open={!!pendingScopeEdit} onOpenChange={(open) => !open && setPendingScopeEdit(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>반복되는 지출입니다</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            고정비 자동생성으로 등록된 지출이에요. 어떻게 저장할까요?
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleScopeEditConfirm('instance')} disabled={scopeBusy}>
              {scopeBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              이 항목만 저장
            </Button>
            <Button onClick={() => handleScopeEditConfirm('future')} disabled={scopeBusy}>
              {scopeBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              이후 모두 저장 (고정비 템플릿 변경)
            </Button>
            <Button variant="outline" onClick={() => setPendingScopeEdit(null)} disabled={scopeBusy}>
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
