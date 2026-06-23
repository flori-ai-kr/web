'use client';

import {useState} from 'react';
import {Newspaper} from 'lucide-react';
import {format} from 'date-fns';
import {ko} from '@/lib/date-locale';
import {EmptyState} from '@/components/layout/empty-state';
import {Button} from '@/components/ui/button';
import {FilterPill} from './filter-pill';
import {TrendListItem} from './trend-list-item';
import {TrendDetailDialog} from './trend-detail-dialog';
import {useTrendsList} from '../hooks/use-trends-list';
import {
  TREND_CATEGORIES,
  type ScrapMap,
  type TrendArticle,
  type TrendCategory,
  type TrendScrap,
} from '@/types/insights';

// 트렌드·뉴스 탭에 노출하는 카테고리(요청: 전체/꽃트렌드/시즌영감/업계뉴스).
const VISIBLE_TREND_CATEGORIES = TREND_CATEGORIES.filter((c) => c.value !== 'business');

interface TrendsPanelProps {
  articles: TrendArticle[];
  scrapMap: ScrapMap;
  /** 내가 스크랩한 트렌드(카테고리 무관 전체). 스크랩 보기·카운트의 단일 출처. */
  scrappedArticles: TrendScrap[];
  category: TrendCategory | null;
  scrapedOnly: boolean;
  onCategoryChange: (cat: TrendCategory | null, scrapedOnly: boolean) => void;
}

export function TrendsPanel({
  articles,
  scrapMap,
  scrappedArticles,
  category,
  scrapedOnly,
  onCategoryChange,
}: TrendsPanelProps) {
  const [selected, setSelected] = useState<TrendArticle | null>(null);

  const {filtered, groupedByDate, hasMore, isLoadingMore, loadMore} = useTrendsList({
    initialArticles: articles,
    category,
    scrapMap,
    scrapedOnly,
  });

  // 스크랩 카운트·목록은 카테고리/페이지와 무관하게 항상 '내 전체 스크랩' 기준.
  const scrappedCount = scrappedArticles.length;

  return (
    <div>
      {/* 카테고리 필터 칩 */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <FilterPill
          active={scrapedOnly}
          onClick={() => onCategoryChange(category, !scrapedOnly)}
          label="스크랩"
          glyph="🔖"
          count={scrappedCount}
        />
        <FilterPill
          active={!category && !scrapedOnly}
          onClick={() => onCategoryChange(null, false)}
          label="전체"
          count={articles.length}
        />
        {VISIBLE_TREND_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat.value}
            active={category === cat.value && !scrapedOnly}
            onClick={() => onCategoryChange(cat.value as TrendCategory, false)}
            label={cat.label}
            dotColor={cat.color}
          />
        ))}
      </div>

      {(scrapedOnly ? scrappedArticles.length === 0 : groupedByDate.length === 0) ? (
        <EmptyState
          icon={Newspaper}
          title={scrapedOnly ? '스크랩한 트렌드가 없어요' : '수집된 트렌드가 없어요'}
          description={
            scrapedOnly ? '관심 있는 기사를 스크랩해보세요' : '다음 수집 시각에 자동으로 도착합니다'
          }
        />
      ) : scrapedOnly ? (
        <div className="space-y-3">
          {scrappedArticles.map(({article}) => (
            <TrendListItem
              key={article.id}
              article={article}
              scraped
              onClick={() => setSelected(article)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-7">
          {groupedByDate.map(([date, items]) => (
            <section key={date}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="whitespace-nowrap text-[13px] font-semibold text-foreground">
                  {format(new Date(date), 'yyyy년 M월 d일 (EEEEE)', {locale: ko})}
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {items.map((article) => (
                  <TrendListItem
                    key={article.id}
                    article={article}
                    scraped={!!scrapMap[article.id]}
                    onClick={() => setSelected(article)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!scrapedOnly && hasMore && filtered.length > 0 && (
        <div className="mt-5 flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? '불러오는 중…' : '더 보기'}
          </Button>
        </div>
      )}

      <TrendDetailDialog
        article={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        scrapMap={scrapMap}
      />
    </div>
  );
}
