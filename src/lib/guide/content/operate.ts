import type { GuideArticle } from '../types';

// 섹션: 매장 운영 (매출·지출·예약·고객·사진첩) — 가장 자주 쓰는 핵심 글.
export const OPERATE_ARTICLES: GuideArticle[] = [
  {
    slug: 'sales',
    sectionId: 'operate',
    order: 1,
    title: '매출 관리',
    description: '하루 장사를 끝내고 매출을 1분 만에 기록하고, 한 달 매출을 한눈에 봐요.',
    icon: 'receipt',
    tldr: [
      '+ 버튼 한 번이면 매출 1건 기록 끝',
      '카드 · 현금 · 계좌이체를 결제수단으로 구분해 저장',
      '외상은 미수로 두고, 입금되면 결제 완료로 정산',
    ],
    blocks: [
      { type: 'heading', text: '매출 화면 열어보기' },
      {
        type: 'paragraph',
        text: '아래 메뉴에서 **매출**을 누르면 매출 화면이 열려요. 위쪽에는 합계, 아래쪽에는 매출 목록이 있어요. 처음엔 비어 있고 하루하루 채워 갑니다.',
      },
      { type: 'shot', src: 'sales/01-list', alt: '매출 목록 화면', caption: '위쪽 합계, 아래쪽 매출 목록' },

      { type: 'heading', text: '매출 1건 기록하기' },
      {
        type: 'steps',
        items: [
          '**+ 버튼**을 누르면 매출 입력창이 열려요.',
          '**금액**을 입력해요. 숫자만 넣으면 콤마는 자동으로 붙어요.',
          '**카테고리**를 골라요. 예: 꽃다발 · 화환 · 화분',
          '**결제수단**을 골라요. 카드 · 현금 · 계좌이체',
          '주문자·채널은 필요할 때만 적고, **저장**을 누르면 끝! 합계에 바로 반영돼요.',
        ],
      },
      { type: 'shot', src: 'sales/02-form', alt: '매출 입력 동작', caption: '+ 버튼 → 금액 → 저장까지', kind: 'gif' },
      {
        type: 'callout',
        variant: 'tip',
        title: '길에서 바로 사 가는 손님은',
        text: '**로드 구입**으로 결제수단·채널을 묻지 않고 금액만 빠르게 기록할 수 있어요. 바쁠 때 특히 편해요.',
      },

      { type: 'heading', text: '카드 매출과 외상(미수)' },
      {
        type: 'paragraph',
        text: '카드 결제는 결제수단을 **카드**로 고르고 카드사를 선택하면, 수수료를 뺀 **입금 예정 금액**과 **입금 예정일**을 자동으로 계산해줘요.',
      },
      {
        type: 'paragraph',
        text: '아직 못 받은 외상은 **미수**로 등록해요. 나중에 입금되면 그 매출에서 **결제 완료**를 누르면 정산됩니다.',
      },
      {
        type: 'callout',
        variant: 'warn',
        title: '미수는 꼭 정산해 주세요',
        text: '미수는 "결제 완료"를 누르기 전까지 계속 미수 중으로 표시돼요. 입금을 받았다면 잊지 말고 결제 완료로 바꿔주세요.',
      },

      { type: 'heading', text: '잘못 입력했을 때' },
      {
        type: 'paragraph',
        text: '목록에서 매출을 누르면 **수정**하거나 **삭제**할 수 있어요. 삭제하면 합계에서도 바로 빠져요.',
      },
      {
        type: 'callout',
        variant: 'warn',
        title: '삭제는 되돌릴 수 없어요',
        text: '금액만 틀렸다면 삭제하지 말고 **수정**을 쓰세요. 삭제한 매출은 복구할 수 없습니다.',
      },

      { type: 'heading', text: '원하는 매출만 모아보기' },
      {
        type: 'paragraph',
        text: '상단의 **기간 · 카테고리 · 결제수단 · 채널** 필터로 원하는 매출만 볼 수 있어요. 한 달·요일·카테고리별 추이가 궁금하면 [통계](/admin/guide/statistics)에서 그래프로 봐요.',
      },
      { type: 'shot', src: 'sales/03-filter', alt: '매출 필터', caption: '기간·카테고리·결제수단으로 골라보기' },

      {
        type: 'faq',
        items: [
          {
            q: '카드 결제도 매출에 넣어야 하나요?',
            a: '네. 결제수단만 "카드"로 고르면 현금·계좌이체와 똑같이 합계에 들어가요. 금액은 실제 결제한 금액을 그대로 입력하세요.',
          },
          {
            q: '예약에서 받은 주문도 매출에 또 적어야 하나요?',
            a: '아니요. 예약 캘린더에서 "매출로 전환"을 누르면 자동으로 매출에 들어와 중복으로 입력할 필요가 없어요.',
          },
        ],
      },
    ],
  },
  {
    slug: 'expenses',
    sectionId: 'operate',
    order: 2,
    title: '지출 관리',
    description: '꽃 사입·운영비를 기록하고, 매달 나가는 고정비는 자동으로 챙겨요.',
    icon: 'wallet',
    tldr: [
      '품목·단가·수량을 넣으면 총액이 자동 계산돼요',
      '임대료·구독 같은 고정비는 한 번 등록하면 매달 자동 기록',
      '기간·카테고리 필터로 어디에 얼마 썼는지 한눈에',
    ],
    blocks: [
      { type: 'heading', text: '지출 기록하기' },
      {
        type: 'steps',
        items: [
          '지출 화면에서 **+ 버튼**을 눌러요.',
          '**품목**과 **단가 · 수량**을 넣으면 총액이 자동으로 계산돼요.',
          '**카테고리**(재료비·운영비 등)와 **결제수단**을 골라요.',
          '**저장**을 누르면 끝이에요.',
        ],
      },
      { type: 'shot', src: 'expenses/01-form', alt: '지출 입력 화면', caption: '단가 × 수량 = 총액 자동 계산' },

      { type: 'heading', text: '매달 나가는 고정비' },
      {
        type: 'paragraph',
        text: '임대료·구독료처럼 **매달 반복되는 지출**은 지출 화면의 **고정비 관리**에 한 번만 등록해 두세요. 그러면 매달 정해진 날짜에 자동으로 기록돼요.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: '팁',
        text: '주마다·달마다·해마다 반복을 고를 수 있고, 한 달에 여러 날짜도 지정할 수 있어요.',
      },
      { type: 'shot', src: 'expenses/02-recurring', alt: '고정비 관리 모달', caption: '반복 주기와 날짜 설정' },

      { type: 'heading', text: '자동 등록된 고정비 고치기' },
      {
        type: 'paragraph',
        text: '자동으로 만들어진 고정비도 **일반 지출처럼 한 건씩 수정·삭제**할 수 있어요. 금액이 바뀌었거나 이번 달만 빼고 싶을 때 그 건만 고치면 돼요.',
      },
      {
        type: 'callout',
        variant: 'note',
        title: '참고',
        text: '앞으로의 금액을 통째로 바꾸거나 고정비를 끝내려면 "고정비 관리"에서 템플릿을 수정하세요.',
      },

      { type: 'heading', text: '기간·카테고리로 보기' },
      {
        type: 'paragraph',
        text: '상단 필터로 원하는 기간·카테고리·결제수단의 지출만 모아볼 수 있어요. 어디에 얼마를 쓰는지 카테고리별로 정리돼요.',
      },
      {
        type: 'faq',
        items: [
          {
            q: '고정비를 이번 달만 빼고 싶어요.',
            a: '이번 달 자동 등록된 그 건을 삭제하면 돼요. 템플릿은 그대로라 다음 달에는 다시 정상적으로 등록돼요.',
          },
        ],
      },
    ],
  },
  {
    slug: 'calendar',
    sectionId: 'operate',
    order: 3,
    title: '예약 캘린더',
    description: '주문·예약을 등록하면 픽업 전에 알림으로 챙겨드려요.',
    icon: 'calendar',
    tldr: [
      '캘린더에 주문자·픽업일·메모로 예약을 등록해요',
      '리마인더를 켜면 픽업 전에 푸시 알림을 받아요',
      '픽업이 끝나면 캘린더에서 바로 매출로 전환',
    ],
    blocks: [
      { type: 'heading', text: '예약 등록하기' },
      {
        type: 'steps',
        items: [
          '캘린더에서 날짜를 누르고 **+ 예약**을 선택해요.',
          '**주문자 · 연락처**와 **픽업/배송일**을 넣어요.',
          '꽃 종류·요청사항은 **메모**에 적고 **저장**해요.',
        ],
      },
      { type: 'shot', src: 'calendar/01-form', alt: '예약 등록 화면', caption: '주문자·픽업일·메모 입력' },

      { type: 'heading', text: '미리 알림 받기' },
      {
        type: 'paragraph',
        text: '예약에 **리마인더**를 설정하면 픽업·배송 시간 전에 푸시 알림이 와요. 또 매일 **오전 8시**에 그날 예약 요약도 보내드려요.',
      },
      {
        type: 'callout',
        variant: 'warn',
        title: '알림을 받으려면',
        text: '먼저 [설정](/admin/guide/settings)에서 **푸시 알림**을 켜 주세요. 알림이 꺼져 있으면 리마인더가 오지 않아요.',
      },
      { type: 'shot', src: 'calendar/02-reminder', alt: '리마인더 설정', caption: '픽업 전 알림 시간 설정' },

      { type: 'heading', text: '예약을 매출로 전환' },
      {
        type: 'paragraph',
        text: '픽업이 끝나 결제가 완료되면, 그 예약을 다시 적을 필요 없이 캘린더에서 바로 **매출로 전환**할 수 있어요. 매출에 자동으로 들어가요.',
      },
      {
        type: 'callout',
        variant: 'tip',
        title: '팁',
        text: '전환할 때 금액·결제수단만 확인하면 돼요. 자세한 매출 기록은 [매출 관리](/admin/guide/sales)를 참고하세요.',
      },
      {
        type: 'faq',
        items: [
          {
            q: '알림이 안 와요.',
            a: '설정에서 푸시 알림을 켰는지, 그리고 휴대폰·브라우저의 알림 권한이 허용돼 있는지 확인해 주세요. 홈 화면에 앱으로 추가하면 더 안정적으로 받을 수 있어요.',
          },
        ],
      },
    ],
  },
  {
    slug: 'customers',
    sectionId: 'operate',
    order: 4,
    title: '고객 관리 · 등급',
    description: '단골 손님을 전화번호로 식별하고, 등급으로 관리해요.',
    icon: 'users',
    tldr: [
      '전화번호 기준으로 같은 손님을 한 명으로 모아요',
      '신규·단골·VIP 등 등급은 가게 맞춤으로 자유롭게',
      '매출·사진을 고객과 연결하면 이력이 쌓여요',
    ],
    blocks: [
      { type: 'heading', text: '고객 등록하기' },
      {
        type: 'steps',
        items: [
          '고객 화면에서 **+ 버튼**을 눌러요.',
          '**전화번호**를 넣어요. 같은 번호는 한 명으로 관리돼요.',
          '이름·성별·메모를 적고 **저장**해요.',
        ],
      },
      {
        type: 'paragraph',
        text: 'flori는 **전화번호**를 기준으로 같은 손님인지 알아봐요. 같은 번호로 등록하면 구매 이력이 한 명에게 모입니다.',
      },
      { type: 'shot', src: 'customers/01-form', alt: '고객 등록 화면', caption: '전화번호로 손님 식별' },

      { type: 'heading', text: '등급으로 단골 관리' },
      {
        type: 'paragraph',
        text: '**신규 · 단골 · VIP**처럼 등급을 가게에 맞게 직접 정할 수 있어요. 구매 횟수 기준을 정해 두면 그 횟수에 도달한 손님은 **자동으로 승급**돼요.',
      },
      { type: 'shot', src: 'customers/02-grades', alt: '등급 관리 모달', caption: '가게 맞춤 등급과 기준 설정' },

      { type: 'heading', text: '매출·사진과 연결하기' },
      {
        type: 'paragraph',
        text: '매출을 등록할 때 고객을 연결하면 그 손님의 **구매 이력**이 쌓여요. [사진첩](/admin/guide/gallery)의 작품도 손님과 연결해 "누구의 꽃이었는지" 기록할 수 있어요.',
      },
      {
        type: 'faq',
        items: [
          {
            q: '고객은 무엇으로 구분되나요?',
            a: '전화번호를 기준으로 구분해요. 같은 번호로 등록하면 한 명의 고객으로 이력이 모입니다.',
          },
        ],
      },
    ],
  },
  {
    slug: 'gallery',
    sectionId: 'operate',
    order: 5,
    title: '사진첩',
    description: '완성한 꽃 작품을 모아 포트폴리오처럼 관리해요.',
    icon: 'image',
    tldr: [
      '작품 사진을 카드로 모아요 (한 카드에 최대 10장)',
      '태그로 분류하고 고객과 연결해요',
      '사진 한 장은 5MB 이내',
    ],
    blocks: [
      { type: 'heading', text: '작품 사진 올리기' },
      {
        type: 'steps',
        items: [
          '사진첩에서 **+ 버튼**을 눌러요.',
          '사진을 골라요. 한 카드(작품)에 **최대 10장**까지 올릴 수 있어요.',
          '제목·태그를 적고 **저장**해요.',
        ],
      },
      {
        type: 'callout',
        variant: 'warn',
        title: '사진 용량',
        text: '사진 한 장은 **5MB 이내**여야 해요. 너무 큰 사진은 올라가지 않으니, 휴대폰 기본 카메라로 찍은 정도면 보통 괜찮아요.',
      },
      { type: 'shot', src: 'gallery/01-upload', alt: '사진 업로드 화면', caption: '한 카드에 여러 장 업로드' },

      { type: 'heading', text: '태그와 고객 연결' },
      {
        type: 'paragraph',
        text: '작품에 **태그**를 달아 분류하고(예: 부케·화환·개업), [고객](/admin/guide/customers)과 연결하면 어떤 손님의 작품인지 함께 기록돼요.',
      },
      {
        type: 'faq',
        items: [
          {
            q: '사진은 몇 장까지 올릴 수 있나요?',
            a: '한 카드(작품)에 최대 10장까지, 사진 한 장은 5MB 이내로 올릴 수 있어요.',
          },
        ],
      },
    ],
  },
];
