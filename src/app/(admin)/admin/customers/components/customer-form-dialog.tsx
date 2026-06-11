'use client';

import {useEffect, useRef, useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {Loader2} from 'lucide-react';
import {toast} from 'sonner';
import {
  assignCustomerGrade,
  checkPhoneDuplicate,
  createCustomer,
  revertCustomerGradeAuto,
  updateCustomer,
} from '@/lib/actions/customers';
import {cn, formatPhoneNumber} from '@/lib/utils';
import type {Customer, CustomerGradeConfig} from '@/types/database';

// '자동(구매횟수 기준)' 선택지를 나타내는 sentinel 값.
const AUTO_GRADE = 'auto';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  grades: CustomerGradeConfig[];
  onSuccess: () => void;
}

export function CustomerFormDialog({ open, onOpenChange, customer, grades, onSuccess }: CustomerFormDialogProps) {
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneDuplicate, setPhoneDuplicate] = useState<{ name: string } | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [gradeValue, setGradeValue] = useState<string>(AUTO_GRADE);
  const [isSubmitting, startTransition] = useTransition();
  const phoneCheckRef = useRef<NodeJS.Timeout | null>(null);

  const isEditMode = !!customer;

  useEffect(() => {
    if (open) {
      if (customer) {
        setPhoneValue(formatPhoneNumber(customer.phone || ''));
        setNoteValue(customer.memo || '');
        // 수동 고정 + 등급 id가 있을 때만 특정 등급 선택, 그 외엔 자동.
        setGradeValue(customer.grade_locked && customer.grade_id ? customer.grade_id : AUTO_GRADE);
      } else {
        setPhoneValue('');
        setNoteValue('');
        setGradeValue(AUTO_GRADE);
      }
      setPhoneDuplicate(null);
    }
  }, [open, customer]);

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhoneValue(formatted);
    setPhoneDuplicate(null);

    if (phoneCheckRef.current) clearTimeout(phoneCheckRef.current);

    if (formatted.length >= 12) {
      phoneCheckRef.current = setTimeout(async () => {
        const duplicate = await checkPhoneDuplicate(formatted, customer?.id);
        setPhoneDuplicate(duplicate);
      }, 300);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        // 고객 본 정보 저장(이름/연락처/성별/메모). 실패 시 아래 catch로.
        const savedCustomerId = isEditMode
          ? (await updateCustomer(customer.id, formData), customer.id)
          : (await createCustomer(formData))?.id;

        // 등급 조정은 별도 엔드포인트 호출이므로 독립 try/catch로 분리한다.
        // 고객 정보는 이미 저장됐으므로, 등급 조정만 실패해도 폼은 닫고 새로고침한다.
        try {
          if (isEditMode) {
            if (gradeValue !== AUTO_GRADE) {
              if (gradeValue !== customer.grade_id || !customer.grade_locked) {
                await assignCustomerGrade(customer.id, gradeValue);
              }
            } else if (customer.grade_locked) {
              await revertCustomerGradeAuto(customer.id);
            }
          } else if (gradeValue !== AUTO_GRADE && savedCustomerId) {
            await assignCustomerGrade(savedCustomerId, gradeValue);
          }
          toast.success(isEditMode ? '고객 정보가 수정되었습니다' : '고객이 등록되었습니다');
        } catch (gradeError) {
          console.error('Failed to adjust customer grade:', gradeError);
          toast.error('고객 정보는 저장됐지만 등급 설정에 실패했습니다.');
        }

        onOpenChange(false);
        onSuccess();
      } catch (error: unknown) {
        console.error('Failed to save customer:', error);
        const message = error instanceof Error ? error.message : '';
        if (message.includes('이미') || (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === '23505')) {
          toast.error('이미 등록된 연락처입니다');
        } else {
          toast.error(isEditMode ? '고객 수정에 실패했습니다' : '고객 등록에 실패했습니다');
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">{isEditMode ? '고객 수정' : '고객 등록'}</DialogTitle>
          {!isEditMode && (
            <p className="text-sm text-muted-foreground">고객 정보를 등록하면 매출 입력 시 자동으로 연결돼요.</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label>고객명 *</Label>
            <Input
              name="name"
              placeholder="홍길동"
              required
              autoComplete="name"
              defaultValue={customer?.name || ''}
            />
          </div>
          <div className="space-y-2">
            <Label>연락처 *</Label>
            <Input
              name="phone"
              value={phoneValue}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="010-0000-0000"
              required
              inputMode="tel"
              autoComplete="tel"
              className={cn(phoneDuplicate && "border-danger focus-visible:ring-danger")}
            />
            {phoneDuplicate && (
              <p className="text-xs text-danger">
                이미 등록된 연락처입니다 ({phoneDuplicate.name})
              </p>
            )}
            {!isEditMode && (
              <p className="text-[11px] text-muted-foreground">같은 연락처의 고객은 중복 등록할 수 없어요</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>등급</Label>
              <Select value={gradeValue} onValueChange={setGradeValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_GRADE}>자동(구매횟수 기준)</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>성별</Label>
              <Select name="gender" defaultValue={customer?.gender || 'none'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미지정</SelectItem>
                  <SelectItem value="male">남성</SelectItem>
                  <SelectItem value="female">여성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>메모</Label>
              <span className={cn("text-xs", noteValue.length > 200 ? "text-danger" : "text-muted-foreground")}>
                {noteValue.length}/200
              </span>
            </div>
            <Textarea
              name="memo"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value.slice(0, 200))}
              placeholder="고객에 대한 메모를 입력하세요..."
              className="min-h-[80px] resize-none"
              maxLength={200}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={isSubmitting || !!phoneDuplicate || phoneValue.length < 13}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
