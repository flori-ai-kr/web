// Playwright e2e용 mock BFF 서버 — 외부 의존성 0, 순수 Node http.
// 응답 형태는 src/lib/actions/*.ts 의 Kotlin DTO 미러(camelCase)에서 역산. 인메모리 단일 유저.
// 실행: MOCK_BFF_PORT=18080 node e2e/mock-bff/server.mjs

import http from 'node:http';
import { createSeed } from './seed.mjs';

const PORT = Number(process.env.MOCK_BFF_PORT ?? 18080);
const db = createSeed();

// ─── 유틸 ────────────────────────────────────────────────────

const b64u = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

// middleware.ts 가 payload.exp 를 atob 디코드하므로, exp 1시간 뒤인 무서명 JWT 형태를 만든다.
function makeJwt() {
  const header = b64u({ alg: 'none', typ: 'JWT' });
  const payload = b64u({ sub: 'mock-user-1', exp: Math.floor(Date.now() / 1000) + 3600 });
  return `${header}.${payload}.mock-signature`;
}

function json(res, status, body) {
  if (status === 204 || body === undefined) {
    res.writeHead(204).end();
    return;
  }
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(data);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);
const sum = (arr, f) => arr.reduce((acc, x) => acc + f(x), 0);
const todayStr = () => db.todayStr;

// ─── 도메인 집계 헬퍼 ────────────────────────────────────────

// paymentMethodId → value('card'|'cash'|'transfer'...) 매핑으로 결제수단별 금액 집계
function paymentValue(paymentMethodId) {
  return db.paymentMethods.find((p) => p.id === Number(paymentMethodId))?.value ?? null;
}

function paymentAmounts(sales) {
  const by = { card: 0, cash: 0, transfer: 0, naverpay: 0, kakaopay: 0 };
  for (const s of sales) {
    const v = paymentValue(s.paymentMethodId);
    if (v && v in by) by[v] += s.amount;
  }
  return by;
}

// dashboard.ts KotlinDashboardSummary
function dashboardSummary(sales) {
  const by = paymentAmounts(sales);
  const pending = sales.filter((s) => s.isUnpaid && s.paymentMethodId == null);
  return {
    totalAmount: sum(sales, (s) => s.amount),
    cardAmount: by.card, cashAmount: by.cash, transferAmount: by.transfer,
    naverpayAmount: by.naverpay, kakaopayAmount: by.kakaopay,
    pendingCount: pending.length,
    pendingAmount: sum(pending, (s) => s.amount),
  };
}

function filterSales(query) {
  let list = [...db.sales];
  const start = query.get('startDate');
  const end = query.get('endDate');
  const month = query.get('month');
  if (start && end) list = list.filter((s) => s.date >= start && s.date <= end);
  else if (month) list = list.filter((s) => s.date.startsWith(month));

  const cats = query.getAll('category');
  if (cats.length) list = list.filter((s) => cats.includes(String(s.categoryId)));
  const pays = query.getAll('payment');
  if (pays.length) list = list.filter((s) => pays.includes(String(s.paymentMethodId)));
  const chs = query.getAll('channel');
  if (chs.length) list = list.filter((s) => chs.includes(String(s.channelId)));
  const search = query.get('search');
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((s) =>
      [s.memo, s.customerName, s.categoryLabel].some((v) => v?.toLowerCase().includes(q)),
    );
  }
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

function filterExpenses(query) {
  let list = [...db.expenses];
  const start = query.get('startDate');
  const end = query.get('endDate');
  const month = query.get('month');
  if (start && end) list = list.filter((e) => e.date >= start && e.date <= end);
  else if (month) list = list.filter((e) => e.date.startsWith(month));

  const cats = query.getAll('category');
  if (cats.length) list = list.filter((e) => cats.includes(String(e.categoryId)));
  const pays = query.getAll('payment');
  if (pays.length) list = list.filter((e) => pays.includes(String(e.paymentMethodId)));
  const search = query.get('search');
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((e) =>
      [e.itemName, e.vendor, e.memo].some((v) => v?.toLowerCase().includes(q)),
    );
  }
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

// 분포 집계 → statistics.ts DistributionItem / dashboard.ts *Stat 공용
function distribution(sales, idKey, labels) {
  const map = new Map();
  for (const s of sales) {
    const key = s[idKey] != null ? String(s[idKey]) : 'null';
    const cur = map.get(key) ?? { id: s[idKey], count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += s.amount;
    map.set(key, cur);
  }
  const total = sum(sales, (s) => s.amount);
  return [...map.values()].map((v) => ({
    id: v.id != null ? Number(v.id) : null,
    label: labels.find((l) => l.id === Number(v.id))?.label ?? '미지정',
    amount: v.amount, count: v.count, percentage: pct(v.amount, total),
  }));
}

function timeseriesByDate(items, valueFn) {
  const map = new Map();
  for (const it of items) {
    const cur = map.get(it.date) ?? { date: it.date, amount: 0, count: 0 };
    cur.amount += valueFn(it);
    cur.count += 1;
    map.set(it.date, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ─── 라우팅 테이블 (메서드 + 경로 패턴 → 핸들러) ─────────────

const routes = [
  // ── auth / me ──
  ['POST', /^\/auth\/refresh$/, () => ({
    accessToken: makeJwt(), refreshToken: makeJwt(), tokenType: 'Bearer', expiresIn: 3600,
  })],
  ['GET', /^\/me$/, () => ({
    id: 'mock-user-1', name: '플로리꽃집', nickname: '플로리', email: 'mock@flori.ai.kr',
    profile: { profileImageUrl: null }, onboarded: true,
  })],
  // 커뮤니티 사업자 인증 게이트 (ensureCommunityAccess) — APPROVED로 통과시킨다
  ['GET', /^\/verification\/business\/me$/, () => ({
    status: 'APPROVED', rejectReason: null,
    submittedAt: new Date().toISOString(), reviewedAt: new Date().toISOString(),
  })],

  // ── storage 쿼터 (사이드바 StorageUsageWidget이 모든 admin 페이지에서 호출) ──
  ['GET', /^\/storage\/usage$/, () => ({
    usedBytes: 0, quotaBytes: 3 * 1024 * 1024 * 1024, percent: 0, status: 'OK',
  })],
  ['GET', /^\/storage\/increase-request\/latest$/, () => null], // 대기 중 증설요청 없음

  // ── dashboard ──
  ['GET', /^\/dashboard\/today$/, () => {
    const todaySales = db.sales.filter((s) => s.date === todayStr());
    const active = db.reservations.filter((r) => r.status !== 'cancelled' && r.date >= todayStr());
    return {
      summary: dashboardSummary(todaySales),
      upcomingReservations: active,
      triggeredReminders: [],
      recentSales: [...db.sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
      saleCategories: db.saleCategories.map((c) => ({ value: c.value, label: c.label })),
    };
  }],
  ['GET', /^\/dashboard\/month$/, (q) => {
    const month = q.get('month') ?? db.ym;
    const sales = db.sales.filter((s) => s.date.startsWith(month));
    const expensesM = db.expenses.filter((e) => e.date.startsWith(month));
    const expTotal = sum(expensesM, (e) => e.totalAmount);
    return {
      summary: dashboardSummary(sales),
      expenseTotal: expTotal,
      categoryStats: distribution(sales, 'categoryId', db.saleCategories)
        .map(({ id, ...r }) => ({ categoryId: id, ...r })),
      paymentStats: distribution(sales.filter((s) => s.paymentMethodId != null), 'paymentMethodId', db.paymentMethods)
        .map(({ id, ...r }) => ({ paymentMethodId: id, ...r })),
      channelStats: distribution(sales, 'channelId', db.saleChannels)
        .map(({ id, ...r }) => ({ channelId: id, ...r })),
      customerStats: { totalCustomers: db.customers.length, returningCustomers: 1, newCustomers: 2 },
      expenseStats: db.expenseCategories.map((c) => {
        const amount = sum(expensesM.filter((e) => e.categoryId === c.id), (e) => e.totalAmount);
        return { categoryId: c.id, label: c.label, amount, percentage: pct(amount, expTotal) };
      }).filter((s) => s.amount > 0),
    };
  }],

  // ── community ──
  ['GET', /^\/community\/posts$/, (q) => {
    let posts = [...db.communityPosts];
    const category = q.get('category');
    if (category) posts = posts.filter((p) => p.category === category);
    const search = q.get('search');
    if (search) posts = posts.filter((p) => p.title.includes(search) || p.contentText.includes(search));
    const limit = Number(q.get('limit') ?? 100);
    return { posts: posts.slice(0, limit), hasMore: posts.length > limit };
  }],

  // ── sales ──
  ['GET', /^\/sales\/summary$/, (q) => {
    const list = filterSales(q);
    const by = paymentAmounts(list);
    return {
      total: sum(list, (s) => s.amount),
      card: by.card, naverpay: by.naverpay, transfer: by.transfer, cash: by.cash,
      count: list.length,
    };
  }],
  ['GET', /^\/sales\/suggestions$/, () => ({
    memos: [...new Set(db.sales.map((s) => s.memo).filter(Boolean))],
  })],
  ['GET', /^\/sales$/, (q) => {
    const list = filterSales(q);
    const offset = Number(q.get('offset') ?? 0);
    const limit = Number(q.get('limit') ?? 100);
    return { sales: list.slice(offset, offset + limit), hasMore: offset + limit < list.length };
  }],
  ['POST', /^\/sales$/, (q, m, body) => {
    const sale = newSale(body);
    db.sales.push(sale);
    return sale;
  }],

  // ── settings: 라벨 5종 + preferences ──
  ['GET', /^\/settings\/sale-categories$/, () => db.saleCategories],
  ['GET', /^\/settings\/payment-methods$/, () => db.paymentMethods],
  ['GET', /^\/settings\/sale-channels$/, () => db.saleChannels],
  ['GET', /^\/settings\/expense-categories$/, () => db.expenseCategories],
  ['GET', /^\/settings\/expense-payment-methods$/, () => db.expensePaymentMethods],
  ['GET', /^\/settings\/preferences$/, () => db.preferences],
  ['PUT', /^\/settings\/preferences$/, (q, m, body) => {
    if (Array.isArray(body.items)) db.preferences.bottomNavItems = body.items;
    return db.preferences;
  }],
  ['PUT', /^\/settings\/preferences\/bottom-nav$/, (q, m, body) => {
    if (Array.isArray(body.items)) db.preferences.bottomNavItems = body.items;
    return db.preferences;
  }],

  // ── expenses ──
  ['GET', /^\/expenses\/summary$/, (q) => {
    const list = filterExpenses(q);
    const byCat = new Map();
    for (const e of list) {
      const key = String(e.categoryId);
      const cur = byCat.get(key) ?? { categoryId: e.categoryId, categoryLabel: e.categoryLabel ?? '미지정', amount: 0 };
      cur.amount += e.totalAmount;
      byCat.set(key, cur);
    }
    return { total: sum(list, (e) => e.totalAmount), count: list.length, byCategory: [...byCat.values()] };
  }],
  ['GET', /^\/expenses\/suggestions$/, () => ({
    itemNames: [...new Set(db.expenses.map((e) => e.itemName))],
    vendors: [...new Set(db.expenses.map((e) => e.vendor).filter(Boolean))],
    memos: [...new Set(db.expenses.map((e) => e.memo).filter(Boolean))],
  })],
  ['GET', /^\/expenses$/, (q) => {
    const list = filterExpenses(q);
    const offset = Number(q.get('offset') ?? 0);
    const limit = Number(q.get('limit') ?? 100);
    return { expenses: list.slice(offset, offset + limit), hasMore: offset + limit < list.length };
  }],
  ['POST', /^\/expenses$/, (q, m, body) => {
    const expense = {
      id: db.nid(), date: body.date, itemName: body.itemName,
      categoryId: body.categoryId ?? null,
      categoryLabel: db.expenseCategories.find((c) => c.id === Number(body.categoryId))?.label ?? null,
      unitPrice: body.unitPrice, quantity: body.quantity,
      totalAmount: body.unitPrice * body.quantity,
      paymentMethodId: body.paymentMethodId ?? null,
      paymentMethodLabel: db.expensePaymentMethods.find((p) => p.id === Number(body.paymentMethodId))?.label ?? null,
      cardCompany: body.cardCompany ?? null, vendor: body.vendor ?? null, memo: body.memo ?? null,
      recurringId: null, isRecurringModified: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    db.expenses.push(expense);
    return expense;
  }],

  // ── customers ──
  ['GET', /^\/customers\/search$/, (q) => {
    const query = (q.get('q') ?? '').toLowerCase();
    return db.customers
      .filter((c) => c.name.toLowerCase().includes(query))
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone, grade: c.grade }));
  }],
  // 연락처 중복 체크 (customers.ts checkPhoneDuplicate) — 중복 없으면 204
  ['GET', /^\/customers\/check-phone$/, (q) => {
    const phone = q.get('phone');
    const excludeId = q.get('excludeId');
    const found = db.customers.find((c) => c.phone === phone && c.id !== excludeId);
    return found ? { id: found.id, name: found.name, phone: found.phone, grade: found.grade } : undefined;
  }],
  // 고객 매출 목록 (customers.ts getCustomerSales — KotlinCustomerSalesPage)
  ['GET', /^\/customers\/([^/]+)\/sales$/, (q, match) => {
    const page = Number(q.get('page') ?? 0);
    const size = Number(q.get('size') ?? 10);
    const list = db.sales
      .filter((s) => String(s.customerId) === match[1])
      .sort((a, b) => b.date.localeCompare(a.date));
    return {
      sales: list.slice(page * size, (page + 1) * size),
      hasMore: (page + 1) * size < list.length,
    };
  }],
  ['POST', /^\/customers\/find-or-create$/, (q, m, body) => {
    const found = db.customers.find((c) => c.phone === body.phone);
    if (found) return found;
    const customer = newCustomer(body);
    db.customers.push(customer);
    return customer;
  }],
  ['GET', /^\/customers$/, () =>
    [...db.customers].sort((a, b) => b.totalPurchaseAmount - a.totalPurchaseAmount)],
  ['POST', /^\/customers$/, (q, m, body) => {
    const customer = newCustomer(body);
    db.customers.push(customer);
    return customer;
  }],
  ['GET', /^\/customer-grades$/, () => db.customerGrades],

  // ── reservations ──
  ['GET', /^\/reservations\/suggestions$/, () => ({
    titles: [...new Set(db.reservations.map((r) => r.title))],
    memos: [...new Set(db.reservations.map((r) => r.memo).filter(Boolean))],
  })],
  ['GET', /^\/reservations\/upcoming$/, () =>
    db.reservations
      .filter((r) => r.status !== 'cancelled' && r.date >= todayStr())
      .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))],
  // 헤더 알림(리마인더 발동 목록) — e2e에서는 항상 빈 목록
  ['GET', /^\/reservations\/reminders$/, () => []],
  ['GET', /^\/reservations$/, (q) => {
    const month = q.get('month');
    let list = [...db.reservations];
    if (month) list = list.filter((r) => r.date.startsWith(month));
    return list;
  }],
  // 매출에 연결된 예약(픽업) 목록 (reservations.ts getReservationsForSale)
  ['GET', /^\/reservations\/by-sale\/([^/]+)$/, (q, match) =>
    db.reservations.filter((r) => r.saleId === match[1])],
  // 예약 부분 업데이트 (reservations.ts updateReservation — non-undefined 필드만 반영)
  ['PATCH', /^\/reservations\/([^/]+)$/, (q, match, body) => {
    const r = db.reservations.find((x) => x.id === match[1]);
    if (!r) return undefined;
    for (const key of ['date', 'time', 'customerName', 'customerPhone', 'title', 'memo', 'amount', 'status', 'reminderAt', 'pickupCompleted', 'saleId']) {
      if (body[key] !== undefined) r[key] = body[key];
    }
    r.updatedAt = new Date().toISOString();
    return r;
  }],
  // 예약 → 매출 변환 (reservations.ts convertReservationToSale): 매출 생성 + 예약 enrichment
  ['POST', /^\/reservations\/([^/]+)\/convert-to-sale$/, (q, match, body) => {
    const sale = newSale(body);
    db.sales.push(sale);
    const r = db.reservations.find((x) => x.id === match[1]);
    if (r) {
      r.saleId = sale.id;
      r.saleDate = sale.date;
      r.productCategory = sale.categoryLabel;
      r.customerId = sale.customerId;
      r.saleIsUnpaid = sale.isUnpaid;
      r.salePaymentMethod = sale.paymentMethodLabel;
      r.saleReservationChannel = sale.channelLabel;
      r.updatedAt = new Date().toISOString();
    }
    return sale;
  }],
  ['POST', /^\/reservations$/, (q, m, body) => {
    const reservation = {
      id: db.nid(), date: body.date, time: body.time ?? null,
      customerName: body.customerName, customerPhone: body.customerPhone ?? null,
      title: body.title, memo: body.memo ?? null, status: body.status ?? 'pending',
      saleId: null, amount: body.amount ?? 0,
      reminderAt: body.reminderAt ?? null, reminderSent: false, pickupCompleted: false,
      saleDate: null, productCategory: null, customerId: null, purchaseCount: null,
      saleIsUnpaid: null, salePaymentMethod: null, saleReservationChannel: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    db.reservations.push(reservation);
    return reservation;
  }],

  // ── schedules ──
  ['GET', /^\/schedules$/, (q) => {
    const month = q.get('month');
    if (!month) return db.schedules;
    // 월 범위와 겹치는 이벤트 (startDate <= 월말 && endDate >= 월초)
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    return db.schedules.filter((s) => s.startDate <= monthEnd && s.endDate >= monthStart);
  }],
  ['POST', /^\/schedules$/, (q, m, body) => {
    const schedule = {
      id: db.nid(), title: body.title, startDate: body.startDate, endDate: body.endDate,
      color: body.color ?? '#f43f5e', memo: body.memo ?? null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    db.schedules.push(schedule);
    return schedule;
  }],

  // ── photo cards / tags ──
  // 캘린더 getSaleIdsWithPhotos 가 매출별로 호출 → 카드 없으면 204
  ['GET', /^\/photo-cards\/by-sale\/([^/]+)$/, (q, match) => {
    const card = db.photoCards.find((c) => c.saleId === match[1]);
    return card ?? undefined; // undefined → 204
  }],
  ['GET', /^\/photo-cards$/, (q) => {
    let cards = [...db.photoCards];
    const tag = q.get('tag');
    if (tag) cards = cards.filter((c) => c.tags.includes(tag));
    const customerId = q.get('customerId');
    if (customerId) cards = cards.filter((c) => String(c.customerId) === customerId);
    return {
      cards, nextCursor: null, hasMore: false,
      totalCards: cards.length,
      totalPhotos: sum(cards, (c) => c.photos.length),
    };
  }],
  ['GET', /^\/photo-tags$/, () => db.photoTags],

  // ── statistics ──
  ['GET', /^\/statistics\/sales$/, (q) => {
    const { list } = rangeSales(q);
    const total = sum(list, (s) => s.amount);
    const unpaid = list.filter((s) => s.isUnpaid && s.paymentMethodId == null);
    return {
      kpi: {
        totalAmount: total, totalAmountDeltaPct: 12.5,
        count: list.length, countDelta: 2,
        avgOrderValue: list.length ? Math.round(total / list.length) : 0,
        avgOrderValueDeltaPct: 4.2,
        unpaidBalance: sum(unpaid, (s) => s.amount), unpaidCount: unpaid.length,
      },
      timeseries: timeseriesByDate(list, (s) => s.amount),
      categoryDistribution: distribution(list, 'categoryId', db.saleCategories),
      paymentDistribution: distribution(list.filter((s) => s.paymentMethodId != null), 'paymentMethodId', db.paymentMethods),
      channelDistribution: distribution(list, 'channelId', db.saleChannels),
    };
  }],
  ['GET', /^\/statistics\/expenses$/, (q) => {
    const from = q.get('from') ?? `${db.ym}-01`;
    const to = q.get('to') ?? `${db.ym}-31`;
    const list = db.expenses.filter((e) => e.date >= from && e.date <= to);
    const salesTotal = sum(db.sales.filter((s) => s.date >= from && s.date <= to), (s) => s.amount);
    const total = sum(list, (e) => e.totalAmount);
    return {
      kpi: {
        totalAmount: total, totalAmountDeltaPct: -3.1,
        count: list.length, countDelta: 1,
        expenseRatioPct: pct(total, salesTotal),
        netProfit: salesTotal - total, netProfitDeltaPct: 8.7,
      },
      timeseries: timeseriesByDate(list, (e) => e.totalAmount)
        .map((t) => ({ date: t.date, expense: t.amount, netProfit: -t.amount })),
      categoryDistribution: distribution(
        list.map((e) => ({ ...e, amount: e.totalAmount })), 'categoryId', db.expenseCategories,
      ),
    };
  }],
  ['GET', /^\/statistics\/reservations$/, (q) => {
    const from = q.get('from') ?? `${db.ym}-01`;
    const to = q.get('to') ?? `${db.ym}-31`;
    const list = db.reservations.filter((r) => r.date >= from && r.date <= to);
    return {
      kpi: {
        total: list.length, totalDeltaPct: 0,
        dailyAvg: 0.5, busiestDow: 5, busiestDowPct: 40,
        peakHourBucket: '14-16', peakHourPct: 50,
      },
      timeseries: timeseriesByDate(list, () => 1).map((t) => ({ date: t.date, count: t.count })),
      heatmap: [
        { dow: 5, hourBucket: '14-16', count: 1 },
        { dow: 6, hourBucket: '10-12', count: 1 },
      ],
      dowDistribution: [{ dow: 5, count: 1 }, { dow: 6, count: 1 }],
      hourDistribution: [{ hourBucket: '10-12', count: 1 }, { hourBucket: '14-16', count: 1 }],
    };
  }],
  ['GET', /^\/statistics\/customers$/, () => ({
    kpi: {
      total: db.customers.length, newCustomers: 2, newDelta: 1,
      returningCustomers: 1, returningDelta: 0, returningRatePct: 33.3,
    },
    timeseries: [
      { date: db.d(1), newCustomers: 1 },
      { date: db.d(3), newCustomers: 1 },
    ],
    gradeDistribution: db.customerGrades.map((g) => ({
      grade: g.name,
      count: db.customers.filter((c) => c.grade === g.name).length,
    })),
    genderDistribution: [
      { gender: 'female', count: db.customers.filter((c) => c.gender === 'female').length },
      { gender: 'male', count: db.customers.filter((c) => c.gender === 'male').length },
    ],
    topCustomers: [...db.customers]
      .sort((a, b) => b.totalPurchaseAmount - a.totalPurchaseAmount)
      .slice(0, 5)
      .map((c) => ({
        customerId: Number(c.id), name: c.name, phone: c.phone, grade: c.grade ?? '새싹',
        purchaseCount: c.totalPurchaseCount, totalAmount: c.totalPurchaseAmount,
      })),
  })],
];

function rangeSales(q) {
  const from = q.get('from') ?? `${db.ym}-01`;
  const to = q.get('to') ?? `${db.ym}-31`;
  return { from, to, list: db.sales.filter((s) => s.date >= from && s.date <= to) };
}

// sales.ts SaleCreateRequest(camelCase) → KotlinSale 미러. POST /sales · convert-to-sale 공용.
function newSale(body) {
  const nowIso = new Date().toISOString();
  return {
    id: db.nid(), date: body.date,
    categoryId: body.categoryId ?? null,
    categoryLabel: db.saleCategories.find((c) => c.id === Number(body.categoryId))?.label ?? null,
    amount: body.amount,
    paymentMethodId: body.isUnpaid ? null : (body.paymentMethodId ?? null),
    paymentMethodLabel: body.isUnpaid ? null
      : (db.paymentMethods.find((p) => p.id === Number(body.paymentMethodId))?.label ?? null),
    channelId: body.channelId ?? null,
    channelLabel: db.saleChannels.find((c) => c.id === Number(body.channelId))?.label ?? null,
    customerName: body.customerName ?? null, customerPhone: body.customerPhone ?? null,
    customerId: body.customerId ?? null, memo: body.memo ?? null,
    isUnpaid: !!body.isUnpaid, hasReview: false, photos: null,
    createdAt: nowIso, updatedAt: nowIso,
  };
}

function newCustomer(body) {
  const nowIso = new Date().toISOString();
  return {
    id: db.nid(), name: body.name, phone: body.phone,
    grade: '새싹', gradeId: 1, gradeLocked: false,
    gender: body.gender ?? null, memo: body.memo ?? null,
    totalPurchaseCount: 0, totalPurchaseAmount: 0,
    firstPurchaseDate: null, lastPurchaseDate: null,
    photoThumbnails: [], photoCount: 0,
    createdAt: nowIso, updatedAt: nowIso,
  };
}

// ─── HTTP 서버 ───────────────────────────────────────────────

// 의도적으로 404를 주는 경로 — 경고 없이 응답 (운영자 아님 판정용. unhandled 노이즈 방지)
const KNOWN_404 = [/^\/admin\/me$/];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = routes.find(([method, pattern]) => method === req.method && pattern.test(url.pathname));

  if (!route && KNOWN_404.some((p) => p.test(url.pathname))) {
    json(res, 404, { message: 'not found' });
    return;
  }

  if (!route) {
    console.warn('[mock-bff] unhandled:', req.method, req.url);
    json(res, 404, { message: `mock-bff: 미구현 엔드포인트 ${req.method} ${url.pathname}` });
    return;
  }

  const match = url.pathname.match(route[1]);
  const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
  try {
    const result = route[2](url.searchParams, match, body);
    json(res, result === undefined ? 204 : 200, result);
  } catch (err) {
    console.error('[mock-bff] handler error:', req.method, req.url, err);
    json(res, 500, { message: 'mock-bff internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`[mock-bff] listening on http://localhost:${PORT}`);
});
