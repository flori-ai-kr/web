'use client';

import {useEffect, useMemo, useState, useTransition} from 'react';
import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    horizontalListSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {
    CalendarDays,
    CreditCard,
    Heart,
    Image as ImageIcon,
    Plus,
    Receipt,
    RotateCcw,
    TrendingUp,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import {toast} from 'sonner';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';
import {
    DEFAULT_BOTTOM_NAV_ITEMS,
    MAX_BOTTOM_NAV_ITEMS,
    MIN_BOTTOM_NAV_ITEMS,
    NAV_ITEM_LABELS,
    type NavItemKey,
} from '@/types/database';
import {getUserPreferences, updateBottomNavItems} from '@/lib/actions/insights';
import {AppError} from '@/lib/errors';

const ICON_MAP: Record<NavItemKey, React.ComponentType<{ className?: string }>> = {
  calendar: CalendarDays,
  sales: Receipt,
  expenses: Wallet,
  customers: Users,
  gallery: ImageIcon,
  deposits: CreditCard,
  insights: TrendingUp,
  follows: Heart,
};

const ALL_KEYS: NavItemKey[] = [
  'calendar',
  'sales',
  'expenses',
  'customers',
  'gallery',
  'deposits',
  'insights',
  'follows',
];

export function BottomNavCustomizer() {
  const router = useRouter();
  const [activeItems, setActiveItems] = useState<NavItemKey[]>([]);
  const [initialItems, setInitialItems] = useState<NavItemKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    getUserPreferences()
      .then((prefs) => {
        setActiveItems(prefs.bottom_nav_items);
        setInitialItems(prefs.bottom_nav_items);
      })
      .catch(() => toast.error('설정을 불러오지 못했어요'))
      .finally(() => setIsLoading(false));
  }, []);

  const hiddenItems = useMemo(() => {
    const set = new Set(activeItems);
    return ALL_KEYS.filter((k) => !set.has(k));
  }, [activeItems]);

  const isDirty = useMemo(() => {
    if (activeItems.length !== initialItems.length) return true;
    return activeItems.some((k, i) => initialItems[i] !== k);
  }, [activeItems, initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setActiveItems((items) => {
      const oldIndex = items.indexOf(active.id as NavItemKey);
      const newIndex = items.indexOf(over.id as NavItemKey);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleAddItem = (key: NavItemKey) => {
    if (activeItems.length >= MAX_BOTTOM_NAV_ITEMS) {
      toast.error(`최대 ${MAX_BOTTOM_NAV_ITEMS}개까지 선택할 수 있어요`);
      return;
    }
    setActiveItems((items) => [...items, key]);
  };

  const handleRemoveItem = (key: NavItemKey) => {
    if (activeItems.length <= MIN_BOTTOM_NAV_ITEMS) {
      toast.error(`최소 ${MIN_BOTTOM_NAV_ITEMS}개는 있어야 해요`);
      return;
    }
    setActiveItems((items) => items.filter((k) => k !== key));
  };

  const handleReset = () => {
    setActiveItems([...DEFAULT_BOTTOM_NAV_ITEMS]);
  };

  const handleSave = () => {
    if (activeItems.length < MIN_BOTTOM_NAV_ITEMS || activeItems.length > MAX_BOTTOM_NAV_ITEMS) {
      toast.error(`${MIN_BOTTOM_NAV_ITEMS}~${MAX_BOTTOM_NAV_ITEMS}개 범위로 선택해주세요`);
      return;
    }
    startSaveTransition(async () => {
      try {
        await updateBottomNavItems(activeItems);
        setInitialItems(activeItems);
        toast.success('하단바 설정을 저장했어요');
        router.refresh();
      } catch (error) {
        const message = error instanceof AppError ? error.message : '저장에 실패했어요';
        toast.error(message);
      }
    });
  };

  // 슬롯 시각화: 선택된 항목 + 빈 슬롯 (총 MAX개까지)
  const emptySlotsCount = Math.max(0, MAX_BOTTOM_NAV_ITEMS - activeItems.length);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-medium text-foreground">하단 네비게이션</h3>
          <span className="text-xs text-muted-foreground">
            {activeItems.length} / {MAX_BOTTOM_NAV_ITEMS}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          모바일/태블릿 화면에서 나타나는 하단바를 구성해요. 최소 {MIN_BOTTOM_NAV_ITEMS}개, 최대{' '}
          {MAX_BOTTOM_NAV_ITEMS}개까지 선택할 수 있습니다.
        </p>

        <div className="hidden lg:flex items-start gap-2 mb-4 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
          <span aria-hidden>💡</span>
          <span>이 설정은 모바일·태블릿 화면에서 적용돼요. 데스크톱은 사이드바를 사용합니다.</span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        ) : (
          <>
            {/* Visual dock */}
            <div className="mb-4">
              <div className="text-xs font-medium text-foreground mb-2">하단바 슬롯</div>
              <div className="rounded-xl bg-gray-900 dark:bg-gray-950 p-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={activeItems} strategy={horizontalListSortingStrategy}>
                    <div className="grid grid-cols-6 gap-1.5">
                      {activeItems.map((key) => (
                        <SlotItem
                          key={key}
                          itemKey={key}
                          onRemove={() => handleRemoveItem(key)}
                          canRemove={activeItems.length > MIN_BOTTOM_NAV_ITEMS}
                        />
                      ))}
                      {Array.from({ length: emptySlotsCount }).map((_, i) => (
                        <EmptySlot
                          key={`empty-${i}`}
                          onAdd={() => {
                            if (hiddenItems.length > 0) handleAddItem(hiddenItems[0]!);
                          }}
                          canAdd={hiddenItems.length > 0}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                슬롯을 드래그해서 순서를 바꿀 수 있어요. × 버튼으로 제거, 빈 슬롯 + 버튼으로 다음 메뉴를 추가합니다.
              </p>
            </div>

            {/* Available chips */}
            {hiddenItems.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-medium text-foreground mb-2">사용 가능한 메뉴</div>
                <div className="flex flex-wrap gap-2">
                  {hiddenItems.map((key) => {
                    const Icon = ICON_MAP[key];
                    const disabled = activeItems.length >= MAX_BOTTOM_NAV_ITEMS;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleAddItem(key)}
                        disabled={disabled}
                        className={cn(
                          'inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-colors',
                          'bg-card border-border text-foreground',
                          'enabled:hover:border-brand enabled:hover:text-brand',
                          'disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {NAV_ITEM_LABELS[key]}
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                기본값
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                size="sm"
              >
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SlotItem({
  itemKey,
  onRemove,
  canRemove,
}: {
  itemKey: NavItemKey;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey,
  });

  const Icon = ICON_MAP[itemKey];

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1',
        'bg-brand/25 border-2 border-brand/70 text-white cursor-grab active:cursor-grabbing',
        'touch-none',
      )}
      {...attributes}
      {...listeners}
    >
      {canRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`${NAV_ITEM_LABELS[itemKey]} 제거`}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center z-10"
        >
          <X className="h-3 w-3" aria-hidden />
        </button>
      )}
      <Icon className="h-4 w-4" aria-hidden />
      <span className="text-[10px] leading-tight font-medium truncate max-w-full px-1">
        {NAV_ITEM_LABELS[itemKey]}
      </span>
    </div>
  );
}

function EmptySlot({ onAdd, canAdd }: { onAdd: () => void; canAdd: boolean }) {
  return (
    <button
      type="button"
      onClick={canAdd ? onAdd : undefined}
      disabled={!canAdd}
      className={cn(
        'aspect-square rounded-lg border-2 border-dashed flex items-center justify-center',
        'border-white/20 text-white/50',
        'enabled:hover:border-white/40 enabled:hover:text-white/70 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
      aria-label="메뉴 추가"
    >
      <Plus className="h-4 w-4" aria-hidden />
    </button>
  );
}
