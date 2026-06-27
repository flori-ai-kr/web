import type { GuideArticle } from '../types';

// 섹션: 시작하기. 스크린샷 src는 public/guide/<기능>/<파일> (대표님이 캡처 드롭).
export const START_ARTICLES: GuideArticle[] = [
  {
    slug: 'getting-started',
    sectionId: 'start',
    order: 1,
    title: 'flori 시작하기',
    description: 'flori를 처음 여는 사장님을 위한 로그인·인증·첫 화면 안내예요.',
    icon: 'flower',
    tldr: [
      '카카오·네이버·구글로 비밀번호 없이 로그인해요',
      '사업자등록증으로 한 번만 인증하면 모든 기능이 열려요',
      '메뉴에서 매출·지출·고객·예약 화면을 오가요',
    ],
    blocks: [
      { type: 'heading', text: '로그인하기' },
      {
        type: 'paragraph',
        text: 'flori는 **카카오·네이버·구글** 소셜 로그인으로 시작해요. 따로 아이디·비밀번호를 만들지 않아도 됩니다. 쓰던 계정을 한 번 누르면 끝이에요.',
      },
      { type: 'shot', src: 'getting-started/01-login', kind: 'png', alt: '소셜 로그인 화면', caption: '카카오·네이버·구글 중 하나를 선택' },

      { type: 'heading', text: '사업자 인증하기' },
      {
        type: 'paragraph',
        text: 'flori는 **실제로 운영 중인 꽃집 사장님**을 위한 공간이에요. 그래서 처음 로그인하면 **사업자등록증**으로 한 번 인증을 합니다. 승인되면 매출·고객·커뮤니티 등 모든 기능이 열려요.',
      },
      {
        type: 'callout',
        variant: 'note',
        title: '인증은 얼마나 걸리나요?',
        text: '보통 영업일 기준 하루 안에 처리돼요. 승인 전까지는 인증 화면만 보이고, 승인되면 자동으로 홈으로 들어가요. 승인 여부는 **카카오톡 알림톡**으로 알려드려요.',
      },

      { type: 'heading', text: '첫 화면 둘러보기' },
      {
        type: 'paragraph',
        text: '인증이 끝나면 **홈 화면**이 열려요. 오늘 매출과 예약을 한눈에 보고, **메뉴**에서 매출·지출·고객·예약 같은 기능을 오가요. 메뉴는 컴퓨터에서는 화면 왼쪽, 휴대폰에서는 화면 아래에 있어요.',
      },
      {
        type: 'bullets',
        items: [
          '**홈** — 오늘·이번 달을 한눈에',
          '**매출 · 지출** — 그날그날 장사 기록',
          '**고객 · 사진첩** — 단골 손님과 작품 관리',
          '**예약** — 주문·픽업 일정과 알림',
        ],
      },
      { type: 'shot', src: 'getting-started/02-home', kind: 'png', alt: '인증 후 첫 홈 화면', caption: '홈 화면과 메뉴' },

      { type: 'heading', text: '다음 단계' },
      {
        type: 'paragraph',
        text: '가장 자주 쓰는 [매출 기록하기](/admin/guide/sales)부터 익혀보세요. 하루 1분이면 충분해요.',
      },
    ],
  },
  {
    slug: 'dashboard',
    sectionId: 'start',
    order: 2,
    title: '홈 화면 둘러보기',
    description: '홈(대시보드)에서 오늘과 이번 달을 한눈에 보는 방법이에요.',
    icon: 'home',
    tldr: [
      '시간대에 맞춘 인사와 함께 오늘 할 일을 보여줘요',
      '이번 달 매출·지출·예약·고객을 카드로 요약해요',
      '+ 버튼으로 어디서든 매출·지출·예약을 빠르게 등록해요',
    ],
    blocks: [
      { type: 'heading', text: '오늘 한눈에 보기' },
      {
        type: 'paragraph',
        text: '홈을 열면 시간대에 맞는 인사와 함께 **오늘의 예약·할 일**이 위쪽에 보여요. 출근하자마자 오늘 무엇을 챙겨야 하는지 바로 알 수 있어요.',
      },
      { type: 'shot', src: 'dashboard/01-today', alt: '홈 상단 오늘 요약', caption: '오늘의 인사와 예약 요약' },

      { type: 'heading', text: '이번 달 요약 카드' },
      {
        type: 'paragraph',
        text: '가운데에는 이번 달 **매출 · 지출 · 예약 · 고객** 네 가지가 카드로 정리돼요. 카드를 누르면 해당 화면으로 바로 넘어가요.',
      },
      { type: 'shot', src: 'dashboard/02-cards', alt: '이번 달 4개 요약 카드', caption: '이번 달 핵심 숫자 4가지' },

      { type: 'heading', text: '빠르게 등록하기' },
      {
        type: 'paragraph',
        text: '홈의 **+ 버튼**을 누르면 매출·지출·예약 중 무엇을 등록할지 고를 수 있어요. 고르면 오늘 날짜가 미리 채워진 입력창이 바로 열려요.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: '팁',
        text: '더 자세한 추이(요일별·카테고리별)는 [통계](/admin/guide/statistics)에서, 손님과의 소통은 [커뮤니티](/admin/guide/community)에서 이어가요.',
      },
    ],
  },
];
