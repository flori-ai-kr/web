import {HeroSection} from '@/components/public/hero-section';
import {StatementSection} from '@/components/public/statement-section';
import {InstagramSection} from '@/components/public/instagram-section';
import {FloatingCta} from '@/components/public/floating-cta';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatementSection />
      <InstagramSection />
      <FloatingCta />
    </>
  );
}
