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

      { type: 'heading', text: '대시보드 둘러보기' },
      {
        type: 'paragraph',
        text: '인증이 끝나면 **대시보드 화면**이 열려요. 시간대에 맞춘 인사와 함께, 위쪽엔 **오늘 매출**과 **이번 달 매출·지출·순이익**이 카드로 정리돼요. 아래로는 **다가오는 예약**과 **커뮤니티 최신 글**까지 한 화면에서 확인할 수 있어요.',
      },
      { type: 'shot', src: 'getting-started/02-home', kind: 'png', alt: '대시보드 화면', caption: '대시보드 화면과 메뉴' },
      {
        type: 'paragraph',
        text: '오른쪽 위 **+ 빠른 등록** 버튼을 누르면 매출·지출·예약을 그 자리에서 바로 추가할 수 있어요. 오늘 날짜가 미리 채워져 있어 1분이면 끝나요.',
      },

      { type: 'heading', text: '메뉴 둘러보기' },
      {
        type: 'paragraph',
        text: '메뉴에서 모든 기능을 오가요. 메뉴는 컴퓨터에서는 화면 **왼쪽**, 휴대폰에서는 화면 **아래**에 있어요.',
      },
      {
        type: 'bullets',
        items: [
          '**대시보드** — 오늘·이번 달을 한눈에',
          '**캘린더** — 주문·픽업 일정과 알림',
          '**매출 · 지출** — 그날그날 장사 기록',
          '**통계** — 요일별·카테고리별 매출 흐름',
          '**고객** — 단골 손님 정보와 등급 관리',
          '**사진첩** — 완성한 꽃 작품 보관',
          '**AI 블로그** — AI가 네이버 블로그 글 초안 작성',
          '**인사이트** — 꽃 경매 시세와 지원사업 소식',
          '**커뮤니티** — 다른 꽃집 사장님들과 소통',
          '**프로필 · 설정** — 가게 정보와 알림 관리',
        ],
      },

    ],
  },
  {
    slug: 'mobile-app',
    sectionId: 'start',
    order: 2,
    title: '모바일에서 앱으로 사용하기',
    description: '홈 화면에 flori를 추가하면 앱처럼 빠르게 열고 푸시 알림도 받을 수 있어요.',
    icon: 'smartphone',
    tldr: [
      '홈 화면에 추가하면 아이콘으로 바로 열려요',
      '안드로이드(크롬)·아이폰(사파리) 방법이 조금 달라요',
    ],
    blocks: [
      { type: 'heading', text: '왜 앱으로 추가하나요?' },
      {
        type: 'paragraph',
        text: 'flori는 따로 설치하지 않아도 인터넷 주소로 바로 쓸 수 있어요. 여기에 **홈 화면에 추가**까지 해두면 휴대폰 앱처럼 아이콘으로 바로 열리고, 주소창 없이 화면을 꽉 채워 쓸 수 있어요.',
      },

      { type: 'heading', text: '홈 화면에 추가하기' },
      {
        type: 'paragraph',
        text: '사용하는 휴대폰에 맞는 탭을 골라 따라 해보세요.',
      },
      {
        type: 'tabs',
        tabs: [
          {
            label: '안드로이드',
            blocks: [
              {
                type: 'steps',
                items: [
                  '**크롬**(또는 삼성 인터넷)으로 flori에 접속해요.',
                  '오른쪽 위 **⋮ (점 세 개)** 메뉴를 눌러요.',
                  '**[홈 화면에 추가]**를 누르고, 뜨는 화면에서 **[설치]**를 선택해요.',
                  '**[설치]**를 한 번 더 누르면 홈 화면에 flori 앱이 생겨요.',
                ],
              },
              { type: 'shot', src: 'mobile-app/android-01', kind: 'png', alt: '크롬 앱 열기', caption: '① 크롬 앱을 열어요' },
              { type: 'shot', src: 'mobile-app/android-02', kind: 'png', alt: '홈 화면에 추가 → 설치 선택', caption: '② 메뉴 → 홈 화면에 추가 → [설치]' },
              { type: 'shot', src: 'mobile-app/android-03', kind: 'png', alt: '앱 설치 확인', caption: '③ [설치]를 누르면 끝이에요' },
              {
                type: 'callout',
                variant: 'note',
                title: "'설치'와 '바로가기'의 차이",
                text: '**설치**는 flori를 진짜 앱처럼 설치해요 — 홈 화면 아이콘으로 바로 열리고, 주소창 없이 전체화면으로 쓰며, 알림도 안정적이에요. **바로가기 만들기**는 눌러도 크롬에서 열리는 단순 바로가기예요. **[설치]**를 권장해요.',
              },
              {
                type: 'callout',
                variant: 'note',
                text: '삼성 갤럭시의 기본 브라우저인 **삼성 인터넷**에서도 메뉴를 열고 **[홈 화면에 추가]**(버전에 따라 \'현재 페이지 추가 → 홈 화면\')를 누르면 돼요.',
              },
            ],
          },
          {
            label: '아이폰 (iOS)',
            blocks: [
              {
                type: 'steps',
                items: [
                  '**사파리**로 flori에 접속해요. (여기서는 사파리 기준으로 안내하지만, 크롬에서도 비슷하게 할 수 있어요)',
                  '화면 아래쪽 가운데의 **공유 버튼**(네모에 위 화살표 모양)을 눌러요.',
                  '목록을 내려 **[홈 화면에 추가]**를 눌러요.',
                  '오른쪽 위 **[추가]**를 누르면 끝이에요.',
                ],
              },
              { type: 'shot', src: 'mobile-app/ios-01', kind: 'png', alt: '사파리 공유 시트의 홈 화면에 추가', caption: '사파리 공유 → 홈 화면에 추가' },
              { type: 'shot', src: 'mobile-app/ios-02', kind: 'png', alt: '홈 화면에 추가 확인 화면', caption: '우상단 [추가]를 누르면 끝이에요' },
            ],
          },
        ],
      },

      { type: 'heading', text: '알림까지 켜기' },
      {
        type: 'paragraph',
        text: '홈 화면에 추가했다면 [알림 설정](/admin/guide/notifications)에서 예약·매출 알림을 켜 보세요. 픽업 시간이나 새 예약을 놓치지 않아요.',
      },
    ],
  },
];
