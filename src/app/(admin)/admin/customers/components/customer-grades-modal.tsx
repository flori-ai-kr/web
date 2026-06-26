'use client';

import {useCallback, useEffect, useState} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Checkbox} from '@/components/ui/checkbox';
import {Badge} from '@/components/ui/badge';
import {Pencil, Trash2, Check, X, Loader2, Plus} from 'lucide-react';
import {toast} from 'sonner';
import {
  getCustomerGrades,
  createCustomerGradeConfig,
  updateCustomerGradeConfig,
  deleteCustomerGradeConfig,
  previewGradeThresholdChange,
  type GradeRecomputePreview,
} from '@/lib/actions/customer-grades';
import type {CustomerGradeConfig} from '@/types/database';

type PendingEdit = { id: string; name: string; threshold?: number; clearThreshold?: boolean };

/**
 * 등급 표시 순서: 구매횟수 임계값 있는 등급을 오름차순(0, 5, 10 …)으로 먼저,
 * 임계값 없는(수동 전용) 등급은 그 뒤에 이름 가나다순으로 붙인다.
 */
function sortGradesForDisplay(list: CustomerGradeConfig[]): CustomerGradeConfig[] {
  return [...list].sort((a, b) => {
    if (a.threshold !== null && b.threshold !== null) return a.threshold - b.threshold;
    if (a.threshold === null && b.threshold === null) return a.name.localeCompare(b.name, 'ko');
    return a.threshold === null ? 1 : -1; // 수동 전용(null)은 뒤로
  });
}

interface CustomerGradesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 등급 변경 후 부모(목록) 갱신용 콜백 (선택) */
  onChanged?: () => void;
}

export function CustomerGradesModal({open, onOpenChange, onChanged}: CustomerGradesModalProps) {
  const [grades, setGrades] = useState<CustomerGradeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 추가 폼
  const [newName, setNewName] = useState('');
  const [newUseThreshold, setNewUseThreshold] = useState(true);
  const [newThreshold, setNewThreshold] = useState('0');
  const [isAdding, setIsAdding] = useState(false);

  // 인라인 편집
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUseThreshold, setEditUseThreshold] = useState(true);
  const [editThreshold, setEditThreshold] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  // 삭제 확인 대상
  const [deletingGrade, setDeletingGrade] = useState<CustomerGradeConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 임계값 변경 미리보기 확인 (변경 대상 고객이 있을 때만)
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [preview, setPreview] = useState<GradeRecomputePreview | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const loadGrades = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerGrades();
      setGrades(sortGradesForDisplay(data));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '등급을 불러오지 못했습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadGrades();
      setEditingId(null);
      setDeletingGrade(null);
      setNewName('');
      setNewUseThreshold(true);
      setNewThreshold('0');
    }
  }, [open, loadGrades]);

  const notifyChanged = () => onChanged?.();

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('등급명을 입력해주세요');
      return;
    }
    const threshold = newUseThreshold ? Math.max(0, parseInt(newThreshold, 10) || 0) : null;

    setIsAdding(true);
    try {
      await createCustomerGradeConfig({name, threshold});
      setNewName('');
      setNewUseThreshold(true);
      setNewThreshold('0');
      await loadGrades();
      notifyChanged();
      toast.success('등급이 추가되었습니다');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '등급 추가에 실패했습니다');
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (grade: CustomerGradeConfig) => {
    setEditingId(grade.id);
    setEditName(grade.name);
    setEditUseThreshold(grade.threshold !== null);
    setEditThreshold(String(grade.threshold ?? 0));
  };

  const applyEdit = async (payload: PendingEdit) => {
    if (payload.clearThreshold) {
      await updateCustomerGradeConfig(payload.id, {name: payload.name, clearThreshold: true});
    } else {
      await updateCustomerGradeConfig(payload.id, {name: payload.name, threshold: payload.threshold});
    }
    setEditingId(null);
    await loadGrades();
    notifyChanged();
    toast.success('등급이 수정되었습니다');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      toast.error('등급명을 입력해주세요');
      return;
    }

    const current = grades.find((g) => g.id === editingId);
    const newThreshold = editUseThreshold ? Math.max(0, parseInt(editThreshold, 10) || 0) : null;
    const payload: PendingEdit = editUseThreshold
      ? {id: editingId, name, threshold: newThreshold ?? 0}
      : {id: editingId, name, clearThreshold: true};
    // 임계값이 실제로 바뀔 때만 미리보기(수동전용 전환 포함). 이름만 바뀌면 바로 적용.
    const thresholdChanged = (current?.threshold ?? null) !== newThreshold;

    setIsSaving(true);
    try {
      if (!thresholdChanged) {
        await applyEdit(payload);
        return;
      }
      const pv = await previewGradeThresholdChange(
        editingId,
        editUseThreshold ? {threshold: newThreshold ?? 0} : {clearThreshold: true},
      );
      if (pv.total === 0) {
        // 등급이 바뀌는 고객이 없으면 모달 없이 바로 적용
        await applyEdit(payload);
        return;
      }
      // 변경 대상 고객 있음 → 영향 미리보기 모달
      setPendingEdit(payload);
      setPreview(pv);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '등급 수정에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!pendingEdit) return;
    setIsApplying(true);
    try {
      await applyEdit(pendingEdit);
      setPendingEdit(null);
      setPreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '등급 적용에 실패했습니다');
    } finally {
      setIsApplying(false);
    }
  };

  const closePreview = () => {
    if (isApplying) return;
    setPendingEdit(null);
    setPreview(null);
  };

  const handleDelete = async () => {
    if (!deletingGrade) return;
    setIsDeleting(true);
    try {
      await deleteCustomerGradeConfig(deletingGrade.id);
      setDeletingGrade(null);
      await loadGrades();
      notifyChanged();
      toast.success('등급이 삭제되었습니다');
    } catch (error) {
      // BFF 가 마지막 등급 삭제를 차단 → 메시지 노출
      toast.error(error instanceof Error ? error.message : '등급 삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>등급 관리</DialogTitle>
            {/* 시각적 안내문은 아래 핑크 안내 박스로 대체. 스크린리더용 설명만 sr-only 로 유지(a11y). */}
            <DialogDescription className="sr-only">
              구매횟수 임계값으로 자동 승급되는 테넌트별 커스텀 등급을 관리해요.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-y-auto pr-1 py-1 max-h-[70vh]">
            {/* 안내 */}
            <div className="text-xs rounded-xl p-3 space-y-1.5 bg-brand-muted text-brand">
              <div>📈 <b>평소엔 자동</b> — 구매횟수가 임계값에 도달하면 자동 승급돼요. (예: 10회 → 단골)</div>
              <div>🔒 <b>손으로 등급을 정하면 그 고객은 &ldquo;고정&rdquo;</b> — 이후 더 사도 자동으로 안 바뀌어요.</div>
              <div>↩️ 고객 상세에서 <b>&lsquo;자동 등급으로 되돌리기&rsquo;</b>로 해제할 수 있어요.</div>
            </div>

            {/* 등급 리스트 */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : grades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">등록된 등급이 없습니다</p>
              ) : (
                grades.map((grade) => (
                  <div
                    key={grade.id}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-muted"
                  >
                    {editingId === grade.id ? (
                      <div className="flex-1 space-y-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                          className="h-9 bg-background"
                          placeholder="등급 이름"
                          aria-label="등급 이름"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <Checkbox
                              checked={editUseThreshold}
                              onCheckedChange={(v) => setEditUseThreshold(v === true)}
                              aria-label="구매횟수 자동 승급 사용"
                            />
                            구매횟수
                          </label>
                          {editUseThreshold && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={editThreshold}
                                onChange={(e) => setEditThreshold(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                                className="h-9 w-20 bg-background"
                                aria-label="임계 구매횟수"
                              />
                              <span className="text-sm text-muted-foreground">회</span>
                            </div>
                          )}
                          <div className="flex-1" />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            aria-label="저장"
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-success" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                            aria-label="취소"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="font-semibold flex-1 truncate">{grade.name}</span>
                        {grade.threshold === null ? (
                          <Badge variant="outline" className="text-[11px] font-normal">수동 전용</Badge>
                        ) : (
                          <span className="text-sm font-semibold text-brand">{grade.threshold}회 이상</span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEdit(grade)}
                          aria-label="등급 수정"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setDeletingGrade(grade)}
                          aria-label="등급 삭제"
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 추가 폼 */}
            <div className="rounded-xl border-2 border-dashed border-brand/60 p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">새 등급</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  placeholder="등급 이름 (예: 골드)"
                  aria-label="새 등급 이름"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
                    <Checkbox
                      checked={newUseThreshold}
                      onCheckedChange={(v) => setNewUseThreshold(v === true)}
                      aria-label="구매횟수 자동 승급 사용"
                    />
                    구매횟수
                  </label>
                  {newUseThreshold && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                        className="w-20"
                        aria-label="임계 구매횟수"
                      />
                      <span className="text-sm text-muted-foreground">회</span>
                    </div>
                  )}
                </div>
                <Button onClick={handleAdd} disabled={isAdding} className="shrink-0">
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-1">추가</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                &lsquo;구매횟수&rsquo; 체크를 해제하면 → 수동 전용 등급(자동 승급 대상 아님)이 돼요.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <Dialog open={!!deletingGrade} onOpenChange={(o) => !o && setDeletingGrade(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>등급 삭제</DialogTitle>
            <DialogDescription>
              &lsquo;{deletingGrade?.name}&rsquo; 등급을 삭제할까요? 이 등급의 고객은 &lsquo;미지정&rsquo;이 되며, 다음 구매 시 자동 등급으로 재산정돼요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingGrade(null)} disabled={isDeleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 임계값 변경 영향 미리보기 — 변경 대상 고객이 있을 때만 표시 */}
      <Dialog open={!!pendingEdit} onOpenChange={(o) => !o && closePreview()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>등급 변경 영향</DialogTitle>
            <DialogDescription>
              이 임계값으로 바꾸면 <b className="text-foreground">{preview?.total}명</b>의 고객 등급이 자동으로 바뀝니다.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[45vh] overflow-y-auto space-y-1.5 pr-1">
            {preview?.changes.map((c, i) => (
              <div
                key={`${c.customer_name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground truncate min-w-0">{c.customer_name}</span>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {c.from_grade ?? '미지정'} → <b className="text-brand">{c.to_grade}</b>
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closePreview} disabled={isApplying}>
              취소
            </Button>
            <Button onClick={handleConfirmApply} disabled={isApplying}>
              {isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isApplying ? '적용 중…' : '적용'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
