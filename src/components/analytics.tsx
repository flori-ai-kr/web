import Script from 'next/script';

// ─── 웹 애널리틱스 (Google Analytics 4 + Microsoft Clarity) ────────────────
// - 프로덕션 빌드에서만 로드한다(로컬/dev 트래픽으로 분석 데이터 오염 방지).
// - 각 ID는 NEXT_PUBLIC_ 환경변수로 주입하며, 미설정 시 해당 도구는 로드되지 않는다.
// - GA4 SPA 라우트 전환 추적: GA4 향상된 측정(enhanced measurement)의
//   "방문 페이지 변경"(History 기반)이 기본 활성화돼 있어 별도 page_view 코드가 필요 없다.

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

export function Analytics() {
  if (process.env.NODE_ENV !== 'production') return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      )}

      {CLARITY_ID && (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");`}
        </Script>
      )}
    </>
  );
}
