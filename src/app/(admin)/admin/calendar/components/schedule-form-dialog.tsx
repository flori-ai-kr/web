'use client';

import {Loader2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {DatePicker} from '@/components/ui/date-picker';
import {Label} from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';
import {SCHEDULE_COLORS} from '@/types/database';
import type {useScheduleForm} from '../hooks/use-schedule-form';

/**
 * 일정 등록/수정 모달. 상태·제출 로직은 use-schedule-form 훅이 보유한다.
 */
export function ScheduleFormDialog({ form }: { form: ReturnType<typeof useScheduleForm> }) {
  const {
    showScheduleForm,
    editingScheduleId,
    scheduleForm,
    setScheduleForm,
    isSaving,
    resetScheduleForm,
    handleScheduleSubmit,
  } = form;

  return (
    <Dialog open={showScheduleForm} onOpenChange={(open) => { if (!open) resetScheduleForm(); }}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{editingScheduleId ? '일정 수정' : '새 일정'}</DialogTitle>
        </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">제목 <span className="text-brand">*</span></Label>
              <Input
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                placeholder="졸업 시즌"
                className="h-8"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">시작일 <span className="text-brand">*</span></Label>
                <DatePicker
                  value={scheduleForm.start_date}
                  onChange={(d) => setScheduleForm({ ...scheduleForm, start_date: d })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">종료일 <span className="text-brand">*</span></Label>
                <DatePicker
                  value={scheduleForm.end_date}
                  onChange={(d) => setScheduleForm({ ...scheduleForm, end_date: d })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">색상</Label>
              <div className="flex gap-2">
                {SCHEDULE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setScheduleForm({ ...scheduleForm, color: c.value })}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-transform',
                      scheduleForm.color === c.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: c.value }}
                    aria-label={c.label}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground">메모</Label>
                <span className="text-[11px] text-muted-foreground">
                  {scheduleForm.memo.length}/200
                </span>
              </div>
              <textarea
                value={scheduleForm.memo}
                onChange={(e) => setScheduleForm({ ...scheduleForm, memo: e.target.value })}
                placeholder="메모를 입력하세요"
                maxLength={200}
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring field-sizing-content min-h-[60px] max-h-[160px]"
                aria-label="일정 메모"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9" onClick={resetScheduleForm}>
                취소
              </Button>
              <Button type="submit" size="sm" className="flex-1 h-9" disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {editingScheduleId ? '수정' : '등록'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
