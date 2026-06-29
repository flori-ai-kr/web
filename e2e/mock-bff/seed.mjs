// e2e mock BFF 시드 데이터 — 날짜는 실행 시점(이번 달) 기준 동적 생성.
// 응답 형태는 src/lib/actions/*.ts 의 Kotlin DTO 미러(camelCase)와 1:1.

const pad = (n) => String(n).padStart(2, '0');

export function createSeed() {
  const now = new Date();
  const Y = now.getFullYear();
  const M = now.getMonth(); // 0-based
  const lastDay = new Date(Y, M + 1, 0).getDate();
  const today = now.getDate();

  // 이번 달 안쪽으로 클램프된 날짜 문자열
  const d = (day) => `${Y}-${pad(M + 1)}-${pad(Math.min(Math.max(day, 1), lastDay))}`;
  const iso = (day) => `${d(day)}T09:00:00`;
  const ym = `${Y}-${pad(M + 1)}`;
  const todayStr = d(today);

  let seq = 1000;
  const nid = () => String(++seq);

  // ─── 라벨 설정 (LabelSettingDto: id/value/label/sortOrder) ───
  const saleCategories = [
    { id: 11, value: 'bouquet', label: '꽃다발', sortOrder: 1 },
    { id: 12, value: 'basket', label: '꽃바구니', sortOrder: 2 },
    { id: 13, value: 'plant', label: '화분', sortOrder: 3 },
  ];
  const paymentMethods = [
    { id: 1, value: 'card', label: '카드', sortOrder: 1 },
    { id: 2, value: 'cash', label: '현금', sortOrder: 2 },
    { id: 3, value: 'transfer', label: '계좌이체', sortOrder: 3 },
  ];
  const saleChannels = [
    { id: 21, value: 'road', label: '로드', sortOrder: 1 },
    { id: 22, value: 'kakao', label: '카카오톡', sortOrder: 2 },
    { id: 23, value: 'naver', label: '네이버', sortOrder: 3 },
  ];
  const expenseCategories = [
    { id: 31, value: 'flower_purchase', label: '꽃 사입', sortOrder: 1 },
    { id: 32, value: 'supplies', label: '소모품', sortOrder: 2 },
    { id: 33, value: 'delivery', label: '배송비', sortOrder: 3 },
  ];
  const expensePaymentMethods = [
    { id: 41, value: 'card', label: '카드', sortOrder: 1 },
    { id: 42, value: 'cash', label: '현금', sortOrder: 2 },
  ];

  // ─── 고객 3명 (KotlinCustomer) ───
  const customers = [
    {
      id: '1', name: '김민지', phone: '010-1234-5678', grade: '단골', gradeId: 2,
      gradeLocked: false, gender: 'female', memo: '리시안셔스 선호',
      totalPurchaseCount: 6, totalPurchaseAmount: 320000,
      firstPurchaseDate: d(1), lastPurchaseDate: todayStr,
      photoThumbnails: [{ url: 'https://cdn.example.com/photos/1.jpg', cardId: 1 }],
      photoCount: 1, createdAt: iso(1), updatedAt: iso(today),
    },
    {
      id: '2', name: '이서준', phone: '010-2345-6789', grade: '새싹', gradeId: 1,
      gradeLocked: false, gender: 'male', memo: null,
      totalPurchaseCount: 2, totalPurchaseAmount: 90000,
      firstPurchaseDate: d(2), lastPurchaseDate: d(today - 1),
      photoThumbnails: [], photoCount: 0, createdAt: iso(2), updatedAt: iso(today),
    },
    {
      id: '3', name: '박하은', phone: '010-3456-7890', grade: '새싹', gradeId: 1,
      gradeLocked: true, gender: 'female', memo: '주말 픽업 선호',
      totalPurchaseCount: 1, totalPurchaseAmount: 55000,
      firstPurchaseDate: d(3), lastPurchaseDate: d(3),
      photoThumbnails: [], photoCount: 0, createdAt: iso(3), updatedAt: iso(3),
    },
  ];

  const customerGrades = [
    { id: 1, name: '새싹', threshold: null, sortOrder: 1 },
    { id: 2, name: '단골', threshold: 5, sortOrder: 2 },
  ];

  // ─── 매출 5건 (KotlinSale) — 이번 달, 미수 1건 포함 ───
  const mkSale = (o) => ({
    id: o.id, date: o.date,
    categoryId: o.categoryId,
    categoryLabel: saleCategories.find((c) => c.id === o.categoryId)?.label ?? null,
    amount: o.amount,
    paymentMethodId: o.paymentMethodId,
    paymentMethodLabel: paymentMethods.find((p) => p.id === o.paymentMethodId)?.label ?? null,
    channelId: o.channelId,
    channelLabel: saleChannels.find((c) => c.id === o.channelId)?.label ?? null,
    customerName: o.customerName ?? null, customerPhone: o.customerPhone ?? null,
    customerId: o.customerId ?? null, memo: o.memo ?? null,
    isUnpaid: o.isUnpaid ?? false, hasReview: o.hasReview ?? false,
    photos: o.photos ?? null,
    createdAt: `${o.date}T10:00:00`, updatedAt: `${o.date}T10:00:00`,
  });

  const sales = [
    mkSale({ id: '1', date: d(2), categoryId: 11, amount: 45000, paymentMethodId: 1, channelId: 22, customerName: '김민지', customerPhone: '010-1234-5678', customerId: '1', memo: '생일 꽃다발' }),
    mkSale({ id: '2', date: d(5), categoryId: 12, amount: 80000, paymentMethodId: 3, channelId: 23, customerName: '이서준', customerPhone: '010-2345-6789', customerId: '2', hasReview: true }),
    mkSale({ id: '3', date: d(today - 3), categoryId: 13, amount: 55000, paymentMethodId: 2, channelId: 21, customerName: '박하은', customerPhone: '010-3456-7890', customerId: '3' }),
    // 미수 1건: isUnpaid=true + paymentMethodId=null (isUnsettledUnpaid 판정)
    mkSale({ id: '4', date: d(today - 1), categoryId: 11, amount: 60000, paymentMethodId: null, channelId: 22, customerName: '김민지', customerPhone: '010-1234-5678', customerId: '1', isUnpaid: true, memo: '외상' }),
    mkSale({ id: '5', date: todayStr, categoryId: 12, amount: 70000, paymentMethodId: 1, channelId: 21, memo: '로드 구입' }),
  ];

  // ─── 지출 5건 (KotlinExpense) ───
  const mkExpense = (o) => ({
    id: o.id, date: o.date, itemName: o.itemName,
    categoryId: o.categoryId,
    categoryLabel: expenseCategories.find((c) => c.id === o.categoryId)?.label ?? null,
    unitPrice: o.unitPrice, quantity: o.quantity, totalAmount: o.unitPrice * o.quantity,
    paymentMethodId: o.paymentMethodId,
    paymentMethodLabel: expensePaymentMethods.find((p) => p.id === o.paymentMethodId)?.label ?? null,
    cardCompany: o.cardCompany ?? null, vendor: o.vendor ?? null, memo: o.memo ?? null,
    recurringId: null, isRecurringModified: false,
    createdAt: `${o.date}T08:00:00`, updatedAt: `${o.date}T08:00:00`,
  });

  const expenses = [
    mkExpense({ id: '1', date: d(1), itemName: '장미 한 단', categoryId: 31, unitPrice: 12000, quantity: 5, paymentMethodId: 41, vendor: '양재 꽃시장' }),
    mkExpense({ id: '2', date: d(3), itemName: '포장지', categoryId: 32, unitPrice: 3000, quantity: 10, paymentMethodId: 41, vendor: '포장월드' }),
    mkExpense({ id: '3', date: d(7), itemName: '퀵 배송', categoryId: 33, unitPrice: 15000, quantity: 1, paymentMethodId: 42 }),
    mkExpense({ id: '4', date: d(today - 2), itemName: '리시안셔스', categoryId: 31, unitPrice: 9000, quantity: 8, paymentMethodId: 41, vendor: '양재 꽃시장', memo: '주말 물량' }),
    mkExpense({ id: '5', date: todayStr, itemName: '플로랄폼', categoryId: 32, unitPrice: 2500, quantity: 6, paymentMethodId: 42 }),
  ];

  // ─── 예약 2건 (KotlinReservation, 오늘 이후) + 스케줄 1건 ───
  const mkReservation = (o) => ({
    id: o.id, date: o.date, time: o.time ?? null,
    customerName: o.customerName, customerPhone: o.customerPhone ?? null,
    title: o.title, memo: o.memo ?? null, status: o.status ?? 'pending',
    saleId: o.saleId ?? null, amount: o.amount ?? 0,
    reminderAt: o.reminderAt ?? null, reminderSent: false, pickupCompleted: false,
    // 매출 조인 enrichment (reservations.ts KotlinReservation)
    saleDate: o.saleDate ?? null, productCategory: o.productCategory ?? null,
    customerId: o.customerId ?? null, purchaseCount: o.purchaseCount ?? null,
    saleIsUnpaid: o.saleIsUnpaid ?? null, salePaymentMethod: o.salePaymentMethod ?? null,
    saleReservationChannel: o.saleReservationChannel ?? null,
    createdAt: iso(today), updatedAt: iso(today),
  });

  // 두 예약은 서로 다른 날짜에 둬야 각 셀이 '예약 1건'으로 보인다(smoke 검증).
  // 월말(today≥lastDay-1)엔 d()의 클램프로 today+1·today+2가 같은 날로 뭉쳐 '예약 2건'이 되므로,
  // r1<r2가 항상 유지되도록 각각 lastDay-1·lastDay 이내로 별도 클램프한다.
  const resvDay1 = Math.min(today + 1, lastDay - 1);
  const resvDay2 = Math.min(today + 2, lastDay);
  const reservations = [
    mkReservation({
      id: '1', date: d(resvDay1), time: '14:00', customerName: '김민지', customerPhone: '010-1234-5678',
      title: '결혼기념일 꽃다발', amount: 60000, status: 'confirmed',
      saleId: '1', saleDate: d(2), productCategory: '꽃다발', customerId: '1', purchaseCount: 6,
      saleIsUnpaid: false, salePaymentMethod: '카드', saleReservationChannel: '카카오톡',
    }),
    mkReservation({
      id: '2', date: d(resvDay2), time: '11:00', customerName: '박하은', customerPhone: '010-3456-7890',
      title: '개업 화분 픽업', amount: 90000, memo: '리본 문구: 번창하세요',
    }),
  ];

  const schedules = [
    {
      id: '1', title: '꽃시장 휴무', startDate: d(today + 3), endDate: d(today + 4),
      color: '#f43f5e', memo: null, createdAt: iso(today), updatedAt: iso(today),
    },
  ];

  // ─── 사진첩 (PhotoCardDto 2건 + PhotoTagDto 2개) ───
  const photoTags = [
    { id: '1', name: '꽃다발', createdAt: iso(1) },
    { id: '2', name: '개업화분', createdAt: iso(1) },
  ];

  const photoCards = [
    {
      id: '1', title: '민지님 생일 꽃다발', memo: '핑크 톤', tags: ['꽃다발'],
      photos: [
        { url: 'https://cdn.example.com/photos/1.jpg', originalName: 'bouquet-1.jpg' },
        { url: 'https://cdn.example.com/photos/2.jpg', originalName: 'bouquet-2.jpg' },
      ],
      saleId: '1', customerId: 1, customerName: '김민지',
      createdAt: iso(2), updatedAt: iso(2),
    },
    {
      id: '2', title: '개업 축하 화분', memo: null, tags: ['개업화분'],
      photos: [{ url: 'https://cdn.example.com/photos/3.jpg', originalName: 'plant-1.jpg' }],
      saleId: null, customerId: null, customerName: null,
      createdAt: iso(today - 1), updatedAt: iso(today - 1),
    },
  ];

  // ─── 커뮤니티 글 3건 (PostResponseDto — id는 숫자) ───
  const tiptap = (text) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
  const mkPost = (o) => ({
    id: o.id, authorNickname: o.authorNickname, authorIsAdmin: o.authorIsAdmin ?? false,
    category: o.category, title: o.title, content: tiptap(o.text), contentText: o.text,
    imageUrls: [], isSecret: o.isSecret ?? false, isPinned: o.isPinned ?? false,
    likeCount: o.likeCount ?? 0, commentCount: o.commentCount ?? 0,
    liked: false, isMine: o.isMine ?? false, viewerIsAdmin: o.viewerIsAdmin ?? false, canView: true,
    createdAt: iso(o.day), updatedAt: iso(o.day),
  });

  const communityPosts = [
    mkPost({ id: 3, authorNickname: 'flori 운영팀', authorIsAdmin: true, category: 'notice', title: '6월 업데이트 안내', text: '통계 탭이 추가되었습니다.', isPinned: true, day: today }),
    mkPost({ id: 2, authorNickname: '장미상점', category: 'knowledge', title: '여름철 꽃 보관 노하우', text: '물올림은 아침에 하는 게 좋아요.', likeCount: 5, commentCount: 2, day: today - 1 }),
    mkPost({ id: 1, authorNickname: '꽃피는봄', category: 'question', title: '카네이션 사입 어디서 하시나요?', text: '시즌 가격이 너무 올라서 고민입니다.', likeCount: 1, day: today - 2 }),
  ];

  return {
    now, ym, todayStr, d, nid,
    saleCategories, paymentMethods, saleChannels, expenseCategories, expensePaymentMethods,
    customers, customerGrades, sales, expenses, reservations, schedules,
    photoCards, photoTags, communityPosts,
    preferences: { bottomNavItems: ['dashboard', 'sales', 'expenses', 'customers', 'calendar'] },
  };
}
