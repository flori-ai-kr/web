// 헤이즐 공개 홈페이지 비즈니스 데이터 단일 소스.
// 변경 시 여기 한 곳만 수정.

export const HAZEL_BUSINESS = {
  name: 'hazel',
  descriptor: 'flower studio · seoul',
  legalName: 'hazel flower studio', // 추후 사업자등록증 상호로 교체
  address: '서울 성북구 삼양로9길 14 1층',
  addressShort: '성북구 삼양로9길 14',
  phone: '0507-1484-9064',
  phoneHref: 'tel:+8205014849064',
  // 영업시간 (24:00 = 다음날 0시)
  hours: [
    { day: 'mon', label: '월', time: '08:00 — 23:30', byAppointment: false },
    { day: 'tue', label: '화', time: '08:00 — 23:30', byAppointment: false },
    { day: 'wed', label: '수', time: '08:00 — 23:30', byAppointment: false },
    { day: 'thu', label: '목', time: '08:00 — 24:00', byAppointment: false },
    { day: 'fri', label: '금', time: '08:00 — 24:00', byAppointment: false },
    { day: 'sat', label: '토', time: '08:00 — 23:30', byAppointment: false },
    { day: 'sun', label: '일', time: '08:00 — 23:30', byAppointment: true },
  ],
  hoursNote: '일요일은 예약제 운영 — 방문 전 전화 부탁드립니다.',
} as const;

export const HAZEL_LINKS = {
  kakaoChannel: 'https://pf.kakao.com/_xmNwdn',
  naverPlace: 'https://naver.me/F6lTt2Ji',
  instagram: 'https://www.instagram.com/hazel.gilum',
  instagramHandle: '@hazel.gilum',
  blog: 'https://blog.naver.com/poipin',
} as const;

export const HAZEL_SEO = {
  title: 'hazel — flower studio, seoul',
  description: '조용한 손길로 꽃을 엮는, 서울 성북구의 작은 플라워 스튜디오 헤이즐. 부케 · 공간 데코 · 선물 꽃 주문.',
  ogImage: '/instagram/0.png', // 무드 대표 이미지
} as const;
