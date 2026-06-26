import {getPhotoCardById, getPhotoCards} from '@/lib/actions/photo-cards';
import {getPhotoTags} from '@/lib/actions/photo-tags';
import {getCustomers} from '@/lib/actions/customers';
import {currentKstYearMonth, periodToRange} from '@/lib/period-range';
import {idSchema} from '@/lib/validations';
import {GalleryClient} from './gallery-client';
import {GuideButton} from '@/components/guide/guide-button';

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; customer?: string }>;
}) {
  const { card, customer } = await searchParams;
  // ?customer 는 클라 .find() 에만 쓰이지만, ?card(getPhotoCardById 내부 검증)와 일관되게 형식 검증.
  const customerId = customer && idSchema.safeParse(customer).success ? customer : null;

  // 초기 로드를 현재 월(KST)로 스코프 — 클라이언트 기본 기간과 일치(깜빡임 방지).
  const { year, month } = currentKstYearMonth();
  const { from, to } = periodToRange(year, month, null);

  const [initialData, photoTags, customers, initialSelectedCard] = await Promise.all([
    getPhotoCards(undefined, undefined, undefined, from, to),
    getPhotoTags(),
    getCustomers(),
    // 매출/고객 상세 → '사진첩에서 보기' 딥링크(?card=)는 서버에서 미리 조회해 모달 초기 상태로 전달한다.
    // ⚠️ 클라 useEffect 에서 router/history 로 모달을 열고 URL 을 정리하면, Next App Router 가
    // pushState/replaceState 를 몽키패치(라우터 재렌더)하는 것 + loading.tsx Suspense 와 맞물려
    // GalleryClient 가 무한 리마운트(무한 로딩)된다. 매출(initialSelectedSale)과 동일하게 서버사이드 처리.
    card ? getPhotoCardById(card).catch(() => null) : Promise.resolve(null),
  ]);

  const customerList = customers.map(c => ({ id: c.id, name: c.name, phone: c.phone }));

  return (
    <div className="relative">
      <div className="absolute right-4 top-0 sm:right-6 z-10"><GuideButton slug="gallery" /></div>
      <GalleryClient
        initialData={initialData}
        tags={photoTags}
        customers={customerList}
        initialYear={year}
        initialMonth={month}
        initialSelectedCard={initialSelectedCard}
        initialCustomerId={customerId}
      />
    </div>
  );
}
