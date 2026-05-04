import {HeroSection} from '@/components/public/hero-section';
import {AboutSection} from '@/components/public/about-section';
import {CollectionSection} from '@/components/public/collection-section';
import {OrderSection} from '@/components/public/order-section';
import {LocationSection} from '@/components/public/location-section';
import {InstagramSection} from '@/components/public/instagram-section';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <CollectionSection />
      <OrderSection />
      <LocationSection />
      <InstagramSection />
    </>
  );
}
