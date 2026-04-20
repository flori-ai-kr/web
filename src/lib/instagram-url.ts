/**
 * Instagram CDN URL은 `stp` 파라미터가 서명(`oe`/`oh`/`_nc_ohc`)과 엮여 있어
 * 파라미터를 바꾸면 403이 반환됨. 썸네일 흰 여백은 CSS 스케일/크롭으로 처리하고,
 * 이 함수는 향후 정규화가 필요한 경우를 위한 no-op로 유지.
 */
export function normalizeInstagramImageUrl(url: string): string {
  return url;
}
