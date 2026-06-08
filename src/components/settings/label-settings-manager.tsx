'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Loader2, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';

/** 라벨 설정 항목 공통 모양 (카테고리/결제방식/채널 공유). */
export interface LabelItem {
  id: string;
  label: string;
  is_default: boolean;
}

/** 탭 하나의 구성 — 항목 목록 + CRUD 액션. */
export interface LabelTabConfig {
  key: string;
  /** 탭 버튼 라벨 */
  tabLabel: string;
  /** 추가 입력창 placeholder */
  addPlaceholder: string;
  items: LabelItem[];
  onCreate: (label: string) => Promise<unknown>;
  onUpdate: (id: string, label: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

interface LabelSettingsManagerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  tabs: LabelTabConfig[];
  /** 변경 후 상위에서 목록을 다시 불러오도록 알림 */
  onRefresh: () => void | Promise<void>;
}

/**
 * 매출/지출 라벨 설정(카테고리·결제방식·채널)을 탭으로 묶어 관리하는 공용 모달.
 * 기본 항목(isDefault)은 "기본" 칩만 표시하고 수정·삭제 불가(서버에서도 강제).
 */
export function LabelSettingsManager({
  open,
  onClose,
  title,
  tabs,
  onRefresh,
}: LabelSettingsManagerProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={tabs[0]?.key} className="flex-1 min-h-0 flex flex-col">
          {tabs.length > 1 && (
            <TabsList className="w-full">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="flex-1">
                  {tab.tabLabel}
                </TabsTrigger>
              ))}
            </TabsList>
          )}
          {tabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="flex-1 min-h-0">
              <LabelTabPanel tab={tab} onRefresh={onRefresh} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LabelTabPanel({
  tab,
  onRefresh,
}: {
  tab: LabelTabConfig;
  onRefresh: () => void | Promise<void>;
}) {
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await tab.onCreate(newName.trim());
      setNewName('');
      await onRefresh();
      toast.success('추가되었습니다');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '추가에 실패했습니다');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setIsSaving(true);
    try {
      await tab.onUpdate(editingId, editName.trim());
      setEditingId(null);
      await onRefresh();
      toast.success('수정되었습니다');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '수정에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await tab.onDelete(deletingId);
      setDeletingId(null);
      await onRefresh();
      toast.success('삭제되었습니다');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4 py-4">
      <div className="flex gap-2">
        <Input
          placeholder={tab.addPlaceholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} size="icon" disabled={isAdding} aria-label="추가">
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <div className="space-y-2 overflow-y-auto flex-1 pr-1 min-h-[120px]">
        {tab.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">등록된 항목이 없습니다</p>
        ) : (
          tab.items.map((item) =>
            item.is_default ? (
              // 기본 항목 — "기본" 칩, 수정·삭제 불가
              <div
                key={item.id}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border"
              >
                <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  기본
                </span>
              </div>
            ) : editingId === item.id ? (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  className="flex-1 h-8"
                  autoFocus
                />
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
                  aria-label="취소"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : deletingId === item.id ? (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted w-full">
                <span className="flex-1 text-sm text-danger">삭제하시겠습니까?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : '삭제'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  onClick={() => setDeletingId(null)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border"
              >
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditName(item.label);
                  }}
                  aria-label="수정"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setDeletingId(item.id)}
                  aria-label="삭제"
                >
                  <X className="w-4 h-4 text-danger" />
                </Button>
              </div>
            ),
          )
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        &lsquo;기본&rsquo; 항목은 수정·삭제할 수 없어요. 직접 추가한 항목만 관리됩니다.
      </p>
    </div>
  );
}
