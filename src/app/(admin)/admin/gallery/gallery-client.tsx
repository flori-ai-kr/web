'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {PhotoCard, PhotoTag} from '@/types/database';
import {PhotoCardGrid} from '@/components/gallery/photo-card-grid';
import {TagFilter} from '@/components/gallery/tag-filter';
import {PhotoUploadModal} from '@/components/gallery/photo-upload-modal';
import {PhotoCardDialog} from '@/components/gallery/photo-card-dialog';
import {TagManageModal} from '@/components/gallery/tag-manage-modal';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Image as ImageIcon, Loader2, Plus, Settings, User, X} from 'lucide-react';
import {getPhotoCardById, getPhotoCards, PhotoCardsResponse} from '@/lib/actions/photo-cards';
import {getPhotoTags} from '@/lib/actions/photo-tags';
import {PeriodHeader} from '@/components/layout/period-header';
import {type CustomRange, periodToRange} from '@/lib/period-range';
import {toast} from 'sonner';

interface CustomerOption {
  id: string;
  name: string;
}

interface GalleryClientProps {
  initialData: PhotoCardsResponse;
  tags: PhotoTag[];
  customers: CustomerOption[];
  initialYear: number;
  initialMonth: number;
}

export function GalleryClient({ initialData, tags: initialTags, customers, initialYear, initialMonth }: GalleryClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCustomerId = searchParams.get('customer');
  const initialCustomer = initialCustomerId
    ? customers.find(c => c.id === initialCustomerId) || null
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
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PhotoCard | null>(null);
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
    return customers
      .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
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

  // 딥링크(?customer=<id> / ?card=<id>)로 진입 시 고객 자동 필터 + 해당 포토카드 바로 열기.
  // (useState 초기화는 첫 렌더에 searchParams가 비어있으면 누락될 수 있어 useEffect에서 확실히 적용)
  useEffect(() => {
    const customerId = searchParams.get('customer');
    const cardId = searchParams.get('card');
    if (customerId) {
      const found = customers.find((c) => c.id === customerId);
      if (found) setSelectedCustomer(found);
    }
    if (cardId) {
      getPhotoCardById(cardId)
        .then((card) => { if (card) setSelectedCard(card); })
        .catch(() => {});
    }
    if (customerId || cardId) {
      // URL 정리(뒤로가기 시 재오픈/재적용 방지). 필터는 state로 유지됨.
      const params = new URLSearchParams(searchParams.toString());
      params.delete('customer');
      params.delete('card');
      const qs = params.toString();
      router.replace(qs ? `/admin/gallery?${qs}` : '/admin/gallery', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const response = await getPhotoCards(selectedTag || undefined, cursor || undefined, selectedCustomer?.id, range.from, range.to);
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
  }, [cursor, hasMore, isLoading, selectedTag, selectedCustomer, range.from, range.to]);

  // Reset and reload when tag·customer·기간 changes
  useEffect(() => {
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const response = await getPhotoCards(selectedTag || undefined, undefined, selectedCustomer?.id, range.from, range.to);
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
  }, [selectedTag, selectedCustomer, range.from, range.to]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
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
  }, [hasMore, isLoading, loadMore]);

  const refreshCards = async () => {
    setIsLoading(true);
    try {
      const response = await getPhotoCards(selectedTag || undefined, undefined, selectedCustomer?.id, range.from, range.to);
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


  return (
    <div className="space-y-6 px-4 sm:px-6 py-1 sm:py-2">
      {/* 기간 헤더 — 매출/고객과 동일한 월 네비 + 기간 셀렉터 (등록일 기준) */}
      <PeriodHeader
        periodYear={periodYear}
        periodMonth={periodMonth}
        customRange={customRange}
        onMonthNav={handleMonthNav}
        onRangeApply={setCustomRange}
        onRangeReset={() => setCustomRange(null)}
      />

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

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <TagFilter
            tags={tags}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
          />
        </div>

        {/* 고객 필터 */}
        <div className="flex items-center gap-2">
          {selectedCustomer ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-sm font-medium border border-brand/20">
              <User className="w-3.5 h-3.5" />
              <span>{selectedCustomer.name}</span>
              <button
                type="button"
                onClick={handleClearCustomer}
                className="hover:text-brand/70 transition-colors"
                aria-label="고객 필터 해제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative" ref={customerDropdownRef}>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="고객으로 필터링..."
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
                  className="h-8 w-48 pl-8 text-sm"
                />
              </div>
              {showCustomerDropdown && customerSearch.length > 0 && (
                <div
                  className="absolute z-50 mt-1 w-56 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto"
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
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="px-3 py-2.5 text-sm text-muted-foreground">검색 결과 없음</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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
