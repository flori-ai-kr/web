'use client';

import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, GripVertical, Loader2, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/** 라벨 설정 항목 공통 모양 (카테고리/결제방식/채널 공유). */
export interface LabelItem {
  id: string;
  label: string;
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
  /** 새 순서(전체 id 목록)를 저장. 드래그로 순서 변경 시 호출된다. */
  onReorder: (ids: string[]) => Promise<unknown>;
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
 * 모든 항목은 자유롭게 추가·수정·삭제할 수 있다.
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
            <TabsContent key={tab.key} value={tab.key} className="flex-1 min-h-0 flex flex-col">
              <LabelTabPanel tab={tab} onRefresh={onRefresh} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/** 드래그 가능한 한 행 — 좌측 핸들(≡)로만 잡아서 순서 변경. 편집·삭제 중이면 드래그 비활성. */
function SortableRow({
  id,
  disabled,
  handleLabel,
  children,
}: {
  id: string;
  disabled: boolean;
  handleLabel: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const handle = disabled ? null : (
    <button
      type="button"
      className="flex items-center justify-center h-8 w-5 -ml-1 shrink-0 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
      aria-label={handleLabel}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
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

  // 드래그 순서 변경을 위한 로컬 목록(낙관적). 상위 목록(tab.items)이 바뀌면 렌더 중 동기화한다.
  const [items, setItems] = useState<LabelItem[]>(tab.items);
  const [itemsSource, setItemsSource] = useState<LabelItem[]>(tab.items);
  if (itemsSource !== tab.items) {
    setItemsSource(tab.items);
    setItems(tab.items);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const prev = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next); // 낙관적 적용
    try {
      await tab.onReorder(next.map((i) => i.id));
      // 부모 상태(폼 드롭다운·필터 등)에도 새 순서를 전파 — 전체 새로고침 없이 반영
      await onRefresh();
    } catch (error) {
      setItems(prev); // 실패 시 롤백
      toast.error(error instanceof Error ? error.message : '순서 변경에 실패했습니다');
    }
  };

  const handleAdd = async () => {
    if (isAdding || !newName.trim()) return; // 진행 중 재진입(중복 Enter 등) 차단
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
    if (isSaving || !editingId || !editName.trim()) return; // 진행 중 재진입 차단
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
    <div className="flex flex-col flex-1 min-h-0 space-y-4 py-4">
      <div className="flex gap-2">
        <Input
          placeholder={tab.addPlaceholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            // IME(한글) 조합 확정 Enter는 무시 — 조합 중 Enter가 두 번 발생해 중복 추가되는 것 방지
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd();
          }}
          className="flex-1"
        />
        <Button onClick={handleAdd} size="icon" disabled={isAdding} aria-label="추가">
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {/* 항목 5개까지는 스크롤 없이, 6개부터 스크롤 — 행 ≈54px + 간격 8px 기준 고정 높이. 탭 전환 시 크기 불변 */}
      <div className="space-y-2 overflow-y-auto h-[320px] pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">등록된 항목이 없습니다</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item, idx) => (
                <SortableRow
                  key={item.id}
                  id={item.id}
                  disabled={editingId === item.id || deletingId === item.id}
                  handleLabel={`${item.label} 순서 변경 (${idx + 1}/${items.length}), 드래그하세요`}
                >
                  {(handle) =>
                    editingId === item.id ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSaveEdit();
                          }}
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
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted w-full">
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
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border">
                        {handle}
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
                    )
                  }
                </SortableRow>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
