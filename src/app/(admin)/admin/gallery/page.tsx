import {getPhotoCards} from '@/lib/actions/photo-cards';
import {getPhotoTags} from '@/lib/actions/photo-tags';
import {getCustomers} from '@/lib/actions/customers';
import {currentKstYearMonth, periodToRange} from '@/lib/period-range';
import {GalleryClient} from './gallery-client';

export default async function GalleryPage() {
  // 초기 로드를 현재 월(KST)로 스코프 — 클라이언트 기본 기간과 일치(깜빡임 방지).
  const { year, month } = currentKstYearMonth();
  const { from, to } = periodToRange(year, month, null);

  const [initialData, photoTags, customers] = await Promise.all([
    getPhotoCards(undefined, undefined, undefined, from, to),
    getPhotoTags(),
    getCustomers(),
  ]);

  const customerList = customers.map(c => ({ id: c.id, name: c.name }));

  return (
    <GalleryClient
      initialData={initialData}
      tags={photoTags}
      customers={customerList}
      initialYear={year}
      initialMonth={month}
    />
  );
}
