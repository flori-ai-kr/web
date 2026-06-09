import {LandingHeader} from '@/components/public/landing-header';
import {LandingHero} from '@/components/public/landing-hero';
import {WaitlistSection} from '@/components/public/waitlist-section';
import {LandingFeatures} from '@/components/public/landing-features';
import {LandingFaq} from '@/components/public/landing-faq';
import {LandingCta} from '@/components/public/landing-cta';
import {LandingFooter} from '@/components/public/landing-footer';
import {getWaitlistCount, type WaitlistCount} from '@/lib/actions/waitlist';

export default async function HomePage() {
  let count: WaitlistCount = {count: 0, capacity: 100, closed: false};
  try {
    count = await getWaitlistCount();
  } catch {
    // BFF 미가용 시 0 폴백 — 랜딩은 항상 렌더되어야 함
  }
  const kakaoUrl = process.env.NEXT_PUBLIC_KAKAO_OPENCHAT_URL;
  return (
    <>
      <LandingHeader />
      <LandingHero />
      <WaitlistSection initialCount={count} kakaoUrl={kakaoUrl} />
      <LandingFeatures />
      <LandingFaq />
      <LandingCta />
      <LandingFooter />
    </>
  );
}
