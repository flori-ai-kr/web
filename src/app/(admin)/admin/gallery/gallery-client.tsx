'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {PhotoCard, PhotoTag} from '@/types/database';
import {PhotoCardGrid} from '@/app/(admin)/admin/gallery/components/photo-card-grid';
import {TagFilter} from '@/app/(admin)/admin/gallery/components/tag-filter';
import {PhotoUploadModal} from '@/app/(admin)/admin/gallery/components/photo-upload-modal';
import {PhotoCardDialog} from '@/app/(admin)/admin/gallery/components/photo-card-dialog';
import {TagManageModal} from '@/app/(admin)/admin/gallery/components/tag-manage-modal';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Image as ImageIcon, Loader2, Plus, RotateCcw, Settings, User, X} from 'lucide-react';
import {getPhotoCards, PhotoCardsResponse} from '@/lib/actions/photo-cards';
import {getPhotoTags} from '@/lib/actions/photo-tags';
import {PeriodHeader} from '@/components/layout/period-header';
import {StorageUsageWidget} from '@/components/layout/storage-usage-widget';
import {type CustomRange, periodToRange} from '@/lib/period-range';
import {toast} from 'sonner';

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}

interface GalleryClientProps {
  initialData: PhotoCardsResponse;
  tags: PhotoTag[];
  customers: CustomerOption[];
  initialYear: number;
  initialMonth: number;
  /** 딥링크(?card=)로 진입 시 서버에서 미리 조회해 전달 — 모달 초기 오픈용. */
  initialSelectedCard?: PhotoCard | null;
  /** 딥링크(?customer=)로 진입 시 고객 필터 초기값. */
  initialCustomerId?: string | null;
}

export function GalleryClient({ initialData, tags: initialTags, customers, initialYear, initialMonth, initialSelectedCard, initialCustomerId }: GalleryClientProps) {
  const router = useRouter();
  // BFF가 id를 숫자로 내려줄 수 있어 String 코어션으로 비교(=== 타입 불일치로 필터 누락 방지).
  const initialCustomer = initialCustomerId
    ? customers.find(c => String(c.id) === String(initialCustomerId)) || null
    : null;

  // 기간(월 네비/커스텀 범위) — 기본 현재 월(서버와 동일).
  const [periodYear, setPeriodYear] = useState(initialYear);
  const [periodMonth, setPeriodMonth] = useState(initialMonth);
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const range = useMemo(() => periodToRange(periodYear, periodMonth, customRange), [periodYear, periodMonth, customRange]);

  const [cards, setCards] = useState<PhotoCard[]>(initialData.cards);
  const [cursor, setCursor] = useState<string | null>(initialData.nextCursor);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [totalCards, setTotalCards] = useState(initialData.totalCards);
  const [totalPhotos, setTotalPhotos] = useState(initialData.totalPhotos);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(initialCustomer);
  const [customerSearch, setCustomerSearch] = useState('');

  // 특정 고객으로 필터링할 때는 기간을 무시하고 그 고객의 사진 전체를 보여준다
  // (과거 사진이 현재 월 범위 밖이라 안 보이던 문제 해결). 고객 미선택 시에만 기간 적용.
  const queryFrom = selectedCustomer ? undefined : range.from;
  const queryTo = selectedCustomer ? undefined : range.to;
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PhotoCard | null>(initialSelectedCard ?? null);
  const [editingCard, setEditingCard] = useState<PhotoCard | null>(null);
  const [tags, setTags] = useState<PhotoTag[]>(initialTags);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // 이미 로드한 카드 id 추적 — 중복 추가 방지 + 진전 없으면(무한로딩) 정지
  const loadedIdsRef = useRef<Set<string>>(new Set(initialData.cards.map((c) => c.id)));

  // 고객 검색 결과 메모이제이션
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    const q = customerSearch.toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return customers
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        (qDigits !== '' && (c.phone ?? '').replace(/\D/g, '').includes(qDigits)),
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  const refreshTags = async () => {
    const newTags = await getPhotoTags();
    setTags(newTags);
  };

  // 고객 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 딥링크(?card= / ?customer=)는 서버(page.tsx)에서 미리 조회해 props 로 받아 초기 state 에 반영한다.
  // (구버전은 여기 useEffect 에서 getPhotoCardById + router/history 로 URL 을 변형했는데,
  //  Next App Router 의 history 패치 + loading.tsx Suspense 와 맞물려 무한 리마운트 루프가 났다.)

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const response = await getPhotoCards(selectedTag || undefined, cursor || undefined, selectedCustomer?.id, queryFrom, queryTo);
      // 무한로딩 차단(api 상태 무관): ①새 카드 0개 ②커서가 전진하지 않음 ③에러 → 즉시 정지.
      const fresh = response.cards.filter(c => !loadedIdsRef.current.has(c.id));
      const cursorAdvanced = !!response.nextCursor && response.nextCursor !== cursor;
      if (fresh.length === 0 || !cursorAdvanced) {
        if (fresh.length > 0) {
          fresh.forEach(c => loadedIdsRef.current.add(c.id));
          setCards(prev => [...prev, ...fresh]);
        }
        setHasMore(false);
      } else {
        fresh.forEach(c => loadedIdsRef.current.add(c.id));
        setCards(prev => [...prev, ...fresh]);
        setCursor(response.nextCursor);
        setHasMore(response.hasMore);
      }
    } catch (error) {
      console.error('Error loading more cards:', error);
      setHasMore(false); // 에러 시 무한 재시도 방지
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading, selectedTag, selectedCustomer, queryFrom, queryTo]);

  // Reset and reload when tag·customer·기간 changes
  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const response = await getPhotoCards(selectedTag || undefined, undefined, selectedCustomer?.id, queryFrom, queryTo);
        loadedIdsRef.current = new Set(response.cards.map(c => c.id));
        setCards(response.cards);
        setCursor(response.nextCursor);
        setHasMore(response.hasMore);
        setTotalCards(response.totalCards);
        setTotalPhotos(response.totalPhotos);
      } catch (error) {
        console.error('Error loading cards:', error);
        toast.error('사진 카드를 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitial();
  }, [selectedTag, selectedCustomer, queryFrom, queryTo]);

  // 모달이 열려 있으면 body 스크롤이 잠겨(Radix Dialog) 센티넬이 뷰포트에 고정된 채로 남아
  // IntersectionObserver가 loadMore를 연쇄 호출(런어웨이 페이지네이션 → 무한 로딩)한다.
  // 매출 상세 → '사진첩에서 보기' 딥링크(?card=)로 진입 시 모달이 즉시 떠 이 현상이 발생.
  // 모달이 열린 동안에는 무한스크롤을 일시 정지하고, 닫히면 정상 재개한다.
  const isAnyModalOpen = !!selectedCard || isUploadModalOpen || isTagModalOpen;

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isAnyModalOpen) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadMore, isAnyModalOpen]);

  const refreshCards = async () => {
    setIsLoading(true);
    try {
      const response = await getPhotoCards(selectedTag || undefined, undefined, selectedCustomer?.id, queryFrom, queryTo);
      loadedIdsRef.current = new Set(response.cards.map(c => c.id));
      setCards(response.cards);
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
      setTotalCards(response.totalCards);
      setTotalPhotos(response.totalPhotos);
    } catch (error) {
      console.error('Error refreshing cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    router.push(`/admin/gallery?customer=${customer.id}`, { scroll: false });
  };

  const handleMonthNav = (direction: -1 | 1) => {
    setCustomRange(null);
    let m = periodMonth + direction;
    let y = periodYear;
    if (m < 1) { m = 12; y -= 1; } else if (m > 12) { m = 1; y += 1; }
    setPeriodYear(y);
    setPeriodMonth(m);
  };

  const handleMonthSelect = (year: number, month: number) => {
    setCustomRange(null);
    setPeriodYear(year);
    setPeriodMonth(month);
  };

  // 기간 적용 시 월 필터는 이번 달로 리셋 — 기간을 해제하면 (이전 월이 아니라) 이번 달로 복귀.
  const handleRangeApply = (range: CustomRange) => {
    const now = new Date();
    setPeriodYear(now.getFullYear());
    setPeriodMonth(now.getMonth() + 1);
    setCustomRange(range);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    router.push('/admin/gallery', { scroll: false });
  };

  const handleCardClick = (card: PhotoCard) => {
    setSelectedCard(card);
  };

  const handleEdit = (card: PhotoCard) => {
    setSelectedCard(null);
    setEditingCard(card);
    setIsUploadModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setEditingCard(null);
  };

  // 태그/검색/고객 필터 활성 여부 — 초기화 버튼 노출. 누르면 기간까지 전체 초기화(다른 페이지와 동일).
  const galleryHasFilters = !!selectedTag || customerSearch.trim() !== '' || !!selectedCustomer || !!customRange;
  const handleGalleryReset = () => {
    // 모든 필터를 state 로 직접 리셋(즉시·확실). router.push 단독 의존 금지 — early return 으로
    // setState 가 통째로 누락돼 초기화가 동작 안 하던 버그.
    setSelectedTag(null);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    const now = new Date();
    setPeriodYear(now.getFullYear());
    setPeriodMonth(now.getMonth() + 1);
    setCustomRange(null);
    // 고객 필터가 URL(?customer)에 있었다면 주소도 정리(handleClearCustomer 와 동일 패턴).
    if (selectedCustomer) {
      router.push('/admin/gallery', { scroll: false });
    }
  };


  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2">
      {/* 기간 헤더 — 매출/고객과 동일한 월 네비 + 기간 셀렉터 (등록일 기준). 항상 표시한다.
          (특정 고객 필터 중에는 기간을 무시하고 전체 조회하지만, 헤더는 사라지지 않게 유지) */}
      <PeriodHeader
        periodYear={periodYear}
        periodMonth={periodMonth}
        customRange={customRange}
        onMonthNav={handleMonthNav}
        onMonthSelect={handleMonthSelect}
        onRangeApply={handleRangeApply}
        onRangeReset={() => setCustomRange(null)}
      />

      {/* 저장 용량 — 모바일에서만 페이지 안에 노출(데스크톱은 사이드바 위젯) */}
      <div className="lg:hidden rounded-xl border border-border bg-card px-1 py-1">
        <StorageUsageWidget variant="sidebar" />
      </div>

      {/* 요약 — 현재 기간·필터 기준 총 카드 수 + 총 사진 장수 */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <p className="text-[28px] font-bold tracking-tight text-brand tabular-nums leading-none">
          {totalCards}<span className="text-base font-medium">개</span>
        </p>
        {totalPhotos > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            사진 <span className="font-semibold text-foreground">{totalPhotos}</span>장
          </p>
        )}
      </div>

      {/* 필터 한 줄: 태그(좌) · 고객 검색/칩(채움, 모바일선 축소) · 초기화(우)
          모바일에선 한 줄에 안 들어가면 flex-wrap 으로 초기화 버튼이 아래 줄로 내려간다(sales-filters 동일 패턴). */}
      <div className="flex flex-wrap items-center gap-2">
        <TagFilter
          tags={tags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
        />

        {selectedCustomer ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-sm font-medium border border-brand/20 min-w-0">
            <User className="w-3.5 h-3.5 shrink-0" />
            {/* min-w-0 없으면 flex 아이템 최소폭이 이름 전체폭이 되어 truncate 가 작동하지 않고 칩이 화면 밖으로 밀린다. */}
            <span className="truncate min-w-0">{selectedCustomer.name}</span>
            {selectedCustomer.phone && (
              <span className="hidden sm:inline text-xs text-brand/70 tabular-nums shrink-0">{selectedCustomer.phone}</span>
            )}
            <button
              type="button"
              onClick={handleClearCustomer}
              className="hover:text-brand/70 transition-colors shrink-0"
              aria-label="고객 필터 해제"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[220px]" ref={customerDropdownRef}>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="고객명 또는 연락처로 필터링..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                  if (e.key === 'Escape') setShowCustomerDropdown(false);
                }}
                className="h-8 w-full pl-9 text-sm bg-background rounded-full"
              />
            </div>
            {showCustomerDropdown && customerSearch.length > 0 && (
              <div
                className="absolute z-50 mt-1 w-full bg-popover border rounded-xl shadow-lg max-h-48 overflow-y-auto"
                role="listbox"
                aria-label="고객 목록"
              >
                {filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{customer.name}</span>
                    {customer.phone && (
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
                        {customer.phone}
                      </span>
                    )}
                  </button>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="px-3 py-2.5 text-sm text-muted-foreground">검색 결과 없음</div>
                )}
              </div>
            )}
          </div>
        )}

        {galleryHasFilters && (
          <button
            type="button"
            onClick={handleGalleryReset}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border bg-card text-foreground text-xs font-medium shrink-0 hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            초기화
          </button>
        )}
      </div>

      {/* 고객 필터 시 빈 상태 */}
      {!isLoading && cards.length === 0 && selectedCustomer && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium text-foreground">{selectedCustomer.name}님의 사진이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">매출 등록 시 사진을 추가해보세요</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleClearCustomer}>
            모든 사진 보기
          </Button>
        </div>
      )}

      {(cards.length > 0 || !selectedCustomer) && (
        <PhotoCardGrid
          cards={cards}
          onCardClick={handleCardClick}
        />
      )}

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {isLoading && (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        )}
        {!hasMore && cards.length > 0 && (
          <p className="text-sm text-muted-foreground">모든 카드를 불러왔습니다</p>
        )}
      </div>

      <PhotoUploadModal
        open={isUploadModalOpen}
        onClose={handleCloseModal}
        tags={tags}
        editingCard={editingCard}
        onSuccess={refreshCards}
        onTagsChange={refreshTags}
      />

      <PhotoCardDialog
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onEdit={handleEdit}
        onDelete={refreshCards}
      />

      <TagManageModal
        open={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={tags}
        onTagsChange={refreshTags}
      />

      {/* FAB — Speed Dial */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => { setFabOpen(false); setIsUploadModalOpen(true); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-brand text-white text-sm font-medium shadow-lg"
            >
              <Plus className="w-4 h-4" />
              새 카드 추가
            </button>
            <button
              type="button"
              onClick={() => { setFabOpen(false); setIsTagModalOpen(true); }}
              className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
            >
              <Settings className="w-4 h-4" />
              태그 관리
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform duration-200 ${
            fabOpen ? 'bg-muted-foreground rotate-45' : 'bg-brand'
          }`}
          aria-label="액션 메뉴"
          aria-haspopup="menu"
          aria-expanded={fabOpen}
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
