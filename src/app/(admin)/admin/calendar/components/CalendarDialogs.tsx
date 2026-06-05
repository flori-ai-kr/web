import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Loader2} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {cn} from '@/lib/utils';
import type {PaymentMethod as PaymentMethodType} from '@/lib/actions/sale-settings';

/** 예약 삭제 확인 */
export function DeleteReservationDialog({
  open,
  reservationTitle,
  isDeleting,
  onConfirm,
  onClose,
}: {
  open: boolean;
  reservationTitle?: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>예약 삭제</DialogTitle>
          <DialogDescription>
            &quot;{reservationTitle}&quot; 예약을 삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 예약 삭제 후 연결 매출 삭제 여부 확인 */
export function DeleteSaleDialog({
  open,
  saleDate,
  isDeleting,
  onConfirm,
  onDismiss,
}: {
  open: boolean;
  saleDate?: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>매출도 삭제하시겠습니까?</DialogTitle>
          <DialogDescription>
            {saleDate
              ? `${format(new Date(saleDate), 'yyyy년 M월 d일', { locale: ko })}의 매출도 함께 삭제하시겠습니까?`
              : '연결된 매출도 함께 삭제하시겠습니까?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onDismiss}>
            아니요
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            매출도 삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 일정 삭제 확인 */
export function DeleteScheduleDialog({
  open,
  scheduleTitle,
  isDeleting,
  onConfirm,
  onClose,
}: {
  open: boolean;
  scheduleTitle?: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>일정 삭제</DialogTitle>
          <DialogDescription>
            &quot;{scheduleTitle}&quot; 일정을 삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 미수건 최종 결제방식 선택 후 결제 완료 */
export function UnpaidPaymentDialog({
  open,
  paymentMethods,
  selectedMethod,
  onSelectMethod,
  isCompleting,
  onConfirm,
  onClose,
}: {
  open: boolean;
  paymentMethods: PaymentMethodType[];
  selectedMethod: string;
  onSelectMethod: (value: string) => void;
  isCompleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>결제방식 선택</DialogTitle>
          <DialogDescription>
            미수건의 최종 결제방식을 선택해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 py-2">
          {paymentMethods.map(pm => (
            <button
              key={pm.id}
              type="button"
              className={cn(
                'text-sm py-2 px-4 rounded-lg border transition-colors',
                selectedMethod === pm.id
                  ? 'bg-brand/10 text-brand border-brand font-medium'
                  : 'border-input text-muted-foreground hover:bg-muted'
              )}
              onClick={() => onSelectMethod(pm.id)}
            >
              {pm.label}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button
            onClick={onConfirm}
            disabled={!selectedMethod || isCompleting}
          >
            {isCompleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            결제 완료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
