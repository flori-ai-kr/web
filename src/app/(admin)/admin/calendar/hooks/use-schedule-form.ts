'use client';

import {useState} from 'react';
import {toast} from 'sonner';

import {
    createSchedule,
    deleteSchedule,
    updateSchedule,
} from '@/lib/actions/schedules';
import type {Schedule} from '@/types/database';

/**
 * 일정(캘린더 이벤트) 폼 상태 + 제출/삭제 로직. calendar-client에서 이동.
 */
export function useScheduleForm({ onSaved }: { onSaved: () => void }) {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    start_date: '',
    end_date: '',
    color: '#f43f5e',
    memo: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<Schedule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function resetScheduleForm() {
    setScheduleForm({ title: '', start_date: '', end_date: '', color: '#f43f5e', memo: '' });
    setEditingScheduleId(null);
    setShowScheduleForm(false);
  }

  // 폼만 닫기 (날짜 선택 등 — 필드 값은 다음 오픈 경로에서 항상 다시 채워진다)
  function closeScheduleForm() {
    setShowScheduleForm(false);
    setEditingScheduleId(null);
  }

  function openCreateSchedule(dateStr: string) {
    setScheduleForm({ title: '', start_date: dateStr, end_date: dateStr, color: '#f43f5e', memo: '' });
    setEditingScheduleId(null);
    setShowScheduleForm(true);
  }

  function startEditSchedule(s: Schedule) {
    setEditingScheduleId(s.id);
    setScheduleForm({
      title: s.title,
      start_date: s.start_date,
      end_date: s.end_date,
      color: s.color,
      memo: s.memo || '',
    });
    setShowScheduleForm(true);
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleForm.title.trim()) { toast.error('제목을 입력해주세요'); return; }
    if (!scheduleForm.start_date || !scheduleForm.end_date) { toast.error('시작일과 종료일을 입력해주세요'); return; }
    if (scheduleForm.end_date < scheduleForm.start_date) { toast.error('종료일은 시작일보다 이전일 수 없습니다'); return; }

    setIsSaving(true);
    try {
      if (editingScheduleId) {
        await updateSchedule(editingScheduleId, {
          title: scheduleForm.title,
          start_date: scheduleForm.start_date,
          end_date: scheduleForm.end_date,
          color: scheduleForm.color,
          memo: scheduleForm.memo || null,
        });
        toast.success('일정이 수정되었습니다');
      } else {
        await createSchedule({
          title: scheduleForm.title,
          start_date: scheduleForm.start_date,
          end_date: scheduleForm.end_date,
          color: scheduleForm.color,
          memo: scheduleForm.memo || undefined,
        });
        toast.success('일정이 등록되었습니다');
      }
      resetScheduleForm();
      onSaved();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : (editingScheduleId ? '수정 실패' : '등록 실패'));
    }
    setIsSaving(false);
  }

  async function handleDeleteSchedule() {
    if (!deleteScheduleTarget) return;
    setIsDeleting(true);
    try {
      await deleteSchedule(deleteScheduleTarget.id);
      toast.success('일정이 삭제되었습니다');
      setDeleteScheduleTarget(null);
      resetScheduleForm();
      onSaved();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
    setIsDeleting(false);
  }

  return {
    showScheduleForm,
    editingScheduleId,
    scheduleForm,
    setScheduleForm,
    isSaving,
    deleteScheduleTarget,
    setDeleteScheduleTarget,
    isDeleting,
    resetScheduleForm,
    closeScheduleForm,
    openCreateSchedule,
    startEditSchedule,
    handleScheduleSubmit,
    handleDeleteSchedule,
  };
}
