import type { GuideArticle } from '../types';

// 섹션: 설정 (프로필·알림·구독)
export const SETTINGS_ARTICLES: GuideArticle[] = [
  {
    slug: 'profile',
    sectionId: 'settings',
    order: 1,
    title: '내 가게 프로필 관리',
    description: '가게 이름·주소·영업시간을 등록하고 고객에게 보이는 프로필을 꾸며요.',
    icon: 'store',
    tldr: [
      '가게 이름·주소·전화번호를 입력해두면 고객이 찾을 수 있어요',
      '영업 시간을 설정하면 예약 화면에 자동 반영돼요',
      '대표 사진을 등록해 프로필을 완성하세요',
    ],
    blocks: [
      { type: 'heading', text: '프로필 화면 열기' },
      {
        type: 'paragraph',
        text: '하단 메뉴 **더보기** → **내 가게 프로필**을 누르면 가게 정보를 수정할 수 있어요.',
      },
      { type: 'shot', src: 'profile/01-overview', alt: '내 가게 프로필 화면', caption: '가게 이름·사진·기본 정보' },

      { type: 'heading', text: '기본 정보 입력' },
      {
        type: 'steps',
        items: [
          '**가게 이름**을 입력하세요.',
          '**주소**를 검색해서 선택하세요.',
          '**전화번호**를 입력하세요.',
          '**저장** 버튼을 누르면 바로 반영돼요.',
        ],
      },

      { type: 'heading', text: '영업 시간 설정' },
      {
        type: 'paragraph',
        text: '요일별 영업 시간을 설정할 수 있어요. 쉬는 날은 **휴무** 토글을 켜두세요. 예약 화면에서 휴무일에는 예약이 잡히지 않아요.',
      },
      { type: 'shot', src: 'profile/02-hours', alt: '요일별 영업시간 설정', caption: '요일별 시작·종료 시간 + 휴무 토글' },

      { type: 'heading', text: '대표 사진 등록' },
      {
        type: 'paragraph',
        text: '가게 대표 사진을 올리면 커뮤니티나 고객 화면에 프로필로 표시돼요. 사진 영역을 누르면 카메라 또는 앨범에서 고를 수 있어요.',
      },

      {
        type: 'faq',
        items: [
          {
            q: '가게 이름을 바꾸면 기존 데이터에 영향이 있나요?',
            a: '이미 등록된 매출·고객 데이터는 그대로 유지되고, 이름만 바뀌어요.',
          },
          {
            q: '주소를 여러 개 등록할 수 있나요?',
            a: '현재는 대표 주소 1개만 등록할 수 있어요.',
          },
        ],
      },
    ],
  },
  {
    slug: 'notifications',
    sectionId: 'settings',
    order: 2,
    title: '알림 설정',
    description: '예약 확인·매출 알림·커뮤니티 댓글 등 받고 싶은 알림을 골라 설정해요.',
    icon: 'bell',
    tldr: [
      '알림 종류별로 켜고 끌 수 있어요',
      '방해금지 시간대를 설정해 심야 알림을 차단해요',
      '예약 알림은 미리 받을 시간도 설정 가능해요',
    ],
    blocks: [
      { type: 'heading', text: '알림 설정 화면' },
      {
        type: 'paragraph',
        text: '하단 메뉴 **더보기** → **알림 설정**을 누르세요. 알림 종류별 토글로 원하는 것만 켤 수 있어요.',
      },
      { type: 'shot', src: 'notifications/01-settings', alt: '알림 설정 목록', caption: '종류별 토글과 세부 설정' },

      { type: 'heading', text: '알림 종류' },
      {
        type: 'bullets',
        items: [
          '**예약 알림** — 새 예약이 들어오거나 픽업 시간이 다가올 때',
          '**매출 알림** — 일일 매출 요약 (저녁 시간대 자동 발송)',
          '**커뮤니티** — 내 글에 댓글이 달릴 때',
          '**지원사업** — 관심 지원사업 마감이 7일 남았을 때',
          '**공지·업데이트** — flori 새 기능 출시 소식',
        ],
      },

      { type: 'heading', text: '방해금지 시간대' },
      {
        type: 'paragraph',
        text: '**방해금지** 토글을 켜면 설정한 시간대(예: 밤 10시~아침 7시)에는 알림이 오지 않아요. 급한 예약 알림은 예외로 받을 수 있어요.',
      },

      {
        type: 'callout',
        variant: 'note',
        title: '기기 알림 허용이 먼저예요',
        text: '앱 알림이 오지 않는다면 기기 **설정 → 알림 → flori**에서 알림 허용이 켜져 있는지 확인해 주세요.',
      },

      {
        type: 'faq',
        items: [
          {
            q: '예약 알림을 미리 받을 수 있나요?',
            a: '예약 알림 항목을 누르면 "30분 전·1시간 전·하루 전"을 선택할 수 있어요.',
          },
        ],
      },
    ],
  },
  {
    slug: 'subscription',
    sectionId: 'settings',
    order: 3,
    title: '구독 플랜 관리',
    description: '현재 플랜을 확인하고 업그레이드하거나 결제 내역을 조회해요.',
    icon: 'credit-card',
    tldr: [
      '무료·유료 플랜 차이와 혜택을 비교할 수 있어요',
      '카드 자동결제로 매달 편리하게 구독 갱신이 돼요',
      '언제든 구독을 취소할 수 있어요',
    ],
    blocks: [
      { type: 'heading', text: '현재 플랜 확인' },
      {
        type: 'paragraph',
        text: '하단 메뉴 **더보기** → **구독 관리**를 누르면 현재 플랜과 갱신 날짜가 표시돼요.',
      },
      { type: 'shot', src: 'subscription/01-plan', alt: '구독 플랜 화면', caption: '현재 플랜·갱신일·혜택 요약' },

      { type: 'heading', text: '플랜 업그레이드' },
      {
        type: 'steps',
        items: [
          '**플랜 변경** 버튼을 누르세요.',
          '원하는 플랜(월간·연간)을 선택하세요. 연간이 더 저렴해요.',
          '**카드 번호**를 입력하거나 저장된 카드를 선택하세요.',
          '**결제하기**를 누르면 즉시 유료 기능이 열려요.',
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        title: '연간 구독이 유리해요',
        text: '연간 구독은 월간보다 약 20% 저렴하고, 연 1회만 결제하면 되니 번거롭지 않아요.',
      },
      { type: 'shot', src: 'subscription/02-upgrade', alt: '플랜 선택 화면', caption: '월간·연간 요금 비교' },

      { type: 'heading', text: '결제 내역 조회' },
      {
        type: 'paragraph',
        text: '**결제 내역** 탭에서 지금까지 결제된 내역을 날짜·금액 순으로 볼 수 있어요. 영수증이 필요하면 항목을 누른 뒤 **영수증 보기**를 선택하세요.',
      },

      { type: 'heading', text: '구독 취소' },
      {
        type: 'paragraph',
        text: '언제든지 취소할 수 있어요. 취소해도 **이미 결제한 기간이 끝날 때까지** 유료 기능을 계속 사용할 수 있어요.',
      },
      {
        type: 'callout',
        variant: 'warn',
        title: '취소 전 확인하세요',
        text: '유료 기능(AI 마케팅·무제한 사진첩 등)은 구독 만료 후 자동으로 잠겨요. 데이터는 삭제되지 않으니 안심하세요.',
      },

      {
        type: 'faq',
        items: [
          {
            q: '결제 카드를 바꾸고 싶어요.',
            a: '구독 관리 → **결제 수단 변경**에서 새 카드를 등록하면 다음 결제부터 적용돼요.',
          },
          {
            q: '환불이 가능한가요?',
            a: '결제 후 7일 이내에 유료 기능을 사용하지 않았다면 전액 환불이 가능해요. 고객지원으로 문의해 주세요.',
          },
        ],
      },
    ],
  },
];
