import type { GuideArticle } from '../types';

// 섹션: 성장하기 (통계·인사이트·마케팅)
export const GROW_ARTICLES: GuideArticle[] = [
  {
    slug: 'statistics',
    sectionId: 'grow',
    order: 1,
    title: '통계로 내 가게 파악하기',
    description: '요일별·카테고리별 매출 흐름을 한눈에 보고 잘 팔리는 상품을 찾아요.',
    icon: 'bar-chart-2',
    tldr: [
      '이번 달 매출·지출·순이익을 그래프로 확인해요',
      '요일별·카테고리별로 어떤 날, 어떤 꽃이 잘 팔리는지 알 수 있어요',
      '전달·전년과 비교해 성장세를 확인해요',
    ],
    blocks: [
      { type: 'heading', text: '통계 화면 열기' },
      {
        type: 'paragraph',
        text: '하단 메뉴에서 **통계** 아이콘을 누르면 이번 달 요약이 바로 보여요. 화면 위쪽 날짜 버튼으로 **이번 달·지난 달·특정 월**을 선택할 수 있어요.',
      },
      { type: 'shot', src: 'statistics/01-overview', alt: '통계 화면 전체', caption: '이번 달 매출·지출·순이익 요약' },

      { type: 'heading', text: '매출 그래프 읽기' },
      {
        type: 'paragraph',
        text: '막대 그래프에서 요일별로 어떤 날 매출이 높은지 한눈에 보여요. 막대를 누르면 **그날의 매출 내역** 목록이 아래에 펼쳐져요.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: '이렇게 활용해보세요',
        text: '매출이 낮은 요일을 발견하면 그날 SNS 홍보나 할인 이벤트를 넣어볼 수 있어요.',
      },
      { type: 'shot', src: 'statistics/02-bar-chart', alt: '요일별 매출 막대그래프', caption: '막대를 누르면 상세 내역 확인' },

      { type: 'heading', text: '카테고리별 분석' },
      {
        type: 'paragraph',
        text: '도넛 차트에서 **어떤 종류의 꽃·상품**이 매출 비중이 높은지 확인해요. 카테고리 레이블을 누르면 해당 항목만 필터해서 볼 수 있어요.',
      },
      { type: 'shot', src: 'statistics/03-category', alt: '카테고리별 매출 도넛 차트', caption: '상품 종류별 매출 비중' },

      { type: 'heading', text: '전달·전년과 비교' },
      {
        type: 'paragraph',
        text: '화면 아래쪽 **비교 섹션**에서 전달 같은 기간, 전년 같은 달과 매출을 나란히 볼 수 있어요. 성장세인지 아닌지 숫자로 확인돼요.',
      },

      {
        type: 'faq',
        items: [
          {
            q: '카테고리가 없는 매출은 어떻게 집계되나요?',
            a: '카테고리 없이 등록한 매출은 "기타"로 묶여 표시돼요. [매출 화면](/admin/guide/sales)에서 카테고리를 추가할 수 있어요.',
          },
          {
            q: '기간을 직접 설정할 수 있나요?',
            a: '네, 날짜 버튼을 누르면 달력에서 시작일·종료일을 직접 고를 수 있어요.',
          },
        ],
      },
    ],
  },
  {
    slug: 'insights',
    sectionId: 'grow',
    order: 2,
    title: '정보 피드 — 트렌드와 지원사업',
    description: '꽃 트렌드·경매 소식·소상공인 지원사업을 한 화면에서 확인해요.',
    icon: 'newspaper',
    tldr: [
      '국내 꽃 경매 낙찰가를 매일 업데이트해요',
      '소상공인 대상 지원사업·공모를 모아서 알려줘요',
      '탭을 눌러 경매 소식과 지원사업을 오갈 수 있어요',
    ],
    blocks: [
      { type: 'heading', text: '정보 피드란?' },
      {
        type: 'paragraph',
        text: '**정보** 탭에서는 꽃집 운영에 도움이 되는 두 가지 정보를 매일 자동으로 업데이트해요. 직접 찾아다닐 필요 없이 flori에서 바로 확인할 수 있어요.',
      },
      { type: 'shot', src: 'insights/01-feed', alt: '정보 피드 메인', caption: '경매·지원사업 2개 탭' },

      { type: 'heading', text: '경매 탭 — 오늘 낙찰가' },
      {
        type: 'paragraph',
        text: '경매 탭에서는 **국내 꽃 경매 시장**의 오늘 낙찰 단가를 품목별로 보여줘요. 매입 가격을 정할 때 참고할 수 있어요.',
      },
      { type: 'shot', src: 'insights/02-auction', alt: '꽃 경매 낙찰가 목록', caption: '품목·단가·전일 대비 변동' },

      { type: 'heading', text: '지원사업 탭 — 소상공인 공모' },
      {
        type: 'paragraph',
        text: '지원사업 탭은 **K-Startup(창업지원포털)**과 **기업마당** 두 곳에서 소상공인 관련 지원사업만 골라서 보여줘요. 신청 기한이 있으니 마감 날짜를 꼭 확인하세요.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: '지원사업 신청 팁',
        text: '카드를 누르면 상세 페이지로 이동해요. 마감 7일 전부터 알림을 드릴 예정이에요.',
      },
      { type: 'shot', src: 'insights/03-grants', alt: '지원사업 카드 목록', caption: '신청 기한·지원 기관·링크' },

      {
        type: 'faq',
        items: [
          {
            q: '얼마나 자주 업데이트되나요?',
            a: '경매 데이터는 매일 새벽 자동으로 가져와요. 지원사업은 매일 오전에 신규 공고를 업데이트해요.',
          },
          {
            q: '꽃과 관계없는 지원사업도 나오나요?',
            a: '소상공인 대상 지원사업 중 꽃·화훼·원예와 관련된 것을 우선 보여드려요. 일반 소상공인 지원사업도 일부 포함돼요.',
          },
        ],
      },
    ],
  },
  {
    slug: 'marketing',
    sectionId: 'grow',
    order: 3,
    title: 'AI 마케팅 문구 만들기',
    description: 'AI가 내 가게 스타일에 맞는 SNS 홍보 문구를 자동으로 만들어줘요.',
    icon: 'sparkles',
    tldr: [
      '사진을 올리면 AI가 SNS 문구를 자동으로 제안해요',
      '문구 톤(친근한·전문적인·감성적인)을 고를 수 있어요',
      '마음에 드는 문구를 복사해 인스타그램·블로그에 바로 붙여넣어요',
    ],
    blocks: [
      { type: 'heading', text: 'AI 마케팅이란?' },
      {
        type: 'paragraph',
        text: '꽃 사진 한 장을 올리면 **AI**가 분위기를 분석해서 인스타그램·카카오채널에 올릴 수 있는 **홍보 문구**를 바로 만들어줘요. 글쓰기가 어렵거나 시간이 없을 때 유용해요.',
      },

      { type: 'heading', text: '문구 만들기 순서' },
      {
        type: 'steps',
        items: [
          '**마케팅** 메뉴를 열고 **+ 문구 만들기**를 누르세요.',
          '홍보할 **사진**을 선택하거나 사진첩에서 불러오세요.',
          '**톤**을 고르세요 — 친근한 · 전문적인 · 감성적인 중 하나.',
          '**문구 생성**을 누르면 AI가 3가지 버전을 만들어줘요.',
          '마음에 드는 문구 옆 **복사** 버튼을 눌러 SNS에 붙여넣으세요.',
        ],
      },
      { type: 'shot', src: 'marketing/01-generate', alt: 'AI 문구 생성 화면', caption: '사진 선택 → 톤 선택 → 생성' },
      { type: 'shot', src: 'marketing/02-result', alt: 'AI가 만든 문구 3가지', caption: '3가지 버전 중 하나 복사' },

      {
        type: 'callout',
        variant: 'tip',
        title: '더 좋은 문구를 얻으려면',
        text: '꽃이 선명하게 잘 보이는 사진을 사용하고, 특별한 날(발렌타인·어버이날)이면 행사 이름을 메모란에 적어주세요.',
      },

      {
        type: 'faq',
        items: [
          {
            q: '만든 문구는 저장이 되나요?',
            a: '생성된 문구는 마케팅 탭의 **히스토리**에 자동 저장돼요. 나중에 다시 확인하거나 수정할 수 있어요.',
          },
          {
            q: '몇 번까지 만들 수 있나요?',
            a: '무료 플랜은 월 10회, 유료 플랜은 무제한이에요. 남은 횟수는 화면 위쪽에 표시돼요.',
          },
        ],
      },
    ],
  },
];
