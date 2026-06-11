'use client';

import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import type {Sale} from '@/types/database';

/**
 * 매출 등록 직후 사진 추가 제안 모달. sales-client에서 이동.
 */
export function SalePhotoPromptDialog({
  sale,
  onClose,
  onAddPhoto,
}: {
  sale: Sale | null;
  onClose: () => void;
  onAddPhoto: (sale: Sale) => void;
}) {
  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>사진 추가</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground text-sm">매출이 등록되었습니다. 완성한 꽃 사진을 추가하면 사진첩에서도 볼 수 있어요.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            나중에
          </Button>
          <Button
            onClick={() => {
              if (sale) {
                onAddPhoto(sale);
              }
              onClose();
            }}
          >
            사진 추가
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
