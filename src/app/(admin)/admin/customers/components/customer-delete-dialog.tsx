'use client';

import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import type {Customer} from '@/types/database';

/**
 * 고객 삭제 확인 모달. 연결된 매출 기록은 유지된다는 안내를 포함한다.
 */
export function CustomerDeleteDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: Customer | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>고객 삭제</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground text-sm">
            <span className="font-medium text-foreground">{target?.name}</span> 고객을 삭제하시겠습니까?
          </p>
          <p className="text-muted-foreground text-xs mt-2">연결된 매출 기록은 유지됩니다.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            삭제
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
