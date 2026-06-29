import type { GuideArticle } from '../types';

// 통계(→매장 운영)·인사이트(→정보·소통)·마케팅 아티클. 섹션은 각 article.sectionId 참조.
export const GROW_ARTICLES: GuideArticle[] = [
  {
    slug: 'statistics',
    sectionId: 'operate',
    order: 4,
    title: '통계로 내 가게 파악하기',
    description: '매출·지출·예약·고객을 그래프로 모아 우리 가게 흐름을 한눈에 파악해요.',
    icon: 'bar-chart-2',
    tldr: [
      '이번 달 매출·지출·순이익을 그래프로 확인해요',
      '요일별·카테고리별로 어떤 날, 어떤 꽃이 잘 팔리는지 알 수 있어요',
      '이전 같은 기간과 비교해 성장세를 확인해요',
    ],
    blocks: [
      { type: 'heading', text: '통계 화면 열기' },
      {
        type: 'paragraph',
        text: '**통계** 메뉴를 누르면 이번 달 요약이 바로 보여요. 위쪽 날짜 버튼으로 **이번 달·지난 달·특정 월**을 선택할 수 있어요.',
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

      { type: 'heading', text: '이전 기간과 비교' },
      {
        type: 'paragraph',
        text: '선택한 기간 옆에 **직전 같은 길이의 기간**이 함께 표시돼요. 예를 들어 이번 달을 보면 지난 달과, 최근 3개월을 보면 그 직전 3개월과 매출을 나란히 비교해 성장세를 숫자로 확인할 수 있어요.',
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
    sectionId: 'info',
    order: 1,
    title: '인사이트 — 경매 시세·지원사업',
    description: '국내 꽃 경매 시세와 소상공인 지원사업을 한 화면에서 확인해요.',
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
    sectionId: 'marketing',
    order: 1,
    title: 'AI 네이버 블로그 글쓰기',
    description: 'AI가 키워드·사진으로 네이버 블로그에 올릴 글 초안을 만들어줘요.',
    icon: 'sparkles',
    tldr: [
      '키워드와 사진을 넣으면 AI가 네이버 블로그 글 초안을 만들어요',
      '내 블로그 글을 등록해 두면 내 말투로 써줘요',
      '제목·본문·해시태그까지, 복사해서 네이버에 붙여넣어요',
    ],
    blocks: [
      { type: 'heading', text: 'AI 블로그 글쓰기란?' },
      {
        type: 'paragraph',
        text: '홍보하고 싶은 **키워드**(예: 졸업식 꽃다발)와 **사진**을 넣으면 **AI가 네이버 블로그 글 초안**을 만들어줘요. 제목·본문·자주 묻는 질문·해시태그까지 갖춰서 나오니, **네이버에 복사해 붙여넣기**만 하면 돼요. (자동으로 올라가지는 않아요.)',
      },

      { type: 'heading', text: '초안 만들기' },
      {
        type: 'steps',
        items: [
          '**AI 블로그** 메뉴를 열어요.',
          '홍보할 **키워드**를 넣어요. 상황·메모를 더 적으면 더 구체적인 글이 나와요.',
          '필요하면 **사진**을 0~4장 골라요 (사진첩에서 불러오거나 새로 올려요).',
          '**초안 생성**을 누르면 잠시 뒤 글 한 편이 만들어져요.',
          '제목·본문·해시태그 옆 **복사** 버튼으로 복사해 네이버 블로그에 붙여넣어요.',
        ],
      },
      { type: 'shot', src: 'marketing/01-generate', alt: 'AI 블로그 초안 생성 화면', caption: '키워드·사진 입력 → 초안 생성' },
      { type: 'shot', src: 'marketing/02-result', alt: 'AI가 만든 블로그 초안', caption: '제목·본문·FAQ·해시태그까지' },

      {
        type: 'callout',
        variant: 'note',
        title: '내 말투로 쓰게 하려면',
        text: '화면 위쪽 **말투 설정**에서 내가 쓴 **블로그 글을 1~3개 붙여넣어** 두면, 다음 초안부터 그 말투로 써줘요.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: '더 좋은 초안을 얻으려면',
        text: '키워드를 구체적으로 적고(예: "어버이날 카네이션 꽃바구니"), 꽃이 잘 보이는 사진을 넣어 주세요. 특별한 날이면 상황란에 적으면 좋아요.',
      },
      {
        type: 'callout',
        variant: 'warn',
        title: '생성 중에는',
        text: '초안을 만드는 동안에는 다른 동작이 잠시 막혀요. **탭을 닫거나 새로고침하지 말고** 잠시 기다려 주세요.',
      },

      {
        type: 'faq',
        items: [
          {
            q: '만든 초안은 저장되나요?',
            a: '네, 만든 초안은 화면 아래 **생성된 초안 목록**에 남아 다시 볼 수 있어요.',
          },
          {
            q: '바로 네이버에 올라가나요?',
            a: '아니요. flori는 글 초안만 만들어줘요. 복사해서 네이버 블로그 글쓰기에 붙여넣어 올리면 돼요.',
          },
        ],
      },
    ],
  },
];
