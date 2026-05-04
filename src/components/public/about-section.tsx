import Image from 'next/image';
import {HAZEL_LINKS} from '@/lib/public-config';

const ABOUT_IMAGE = '/instagram/2.png';

export function AboutSection() {
  return (
    <section id="about" className="border-t border-[color:var(--site-pewter)]/15 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32 lg:py-40 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
        {/* Left image */}
        <div className="lg:col-span-5 lg:sticky lg:top-36">
          <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--site-parchment)]">
            <Image
              src={ABOUT_IMAGE}
              alt="헤이즐 플라워 스튜디오 작업대 무드"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        {/* Right text */}
        <div className="lg:col-span-7 lg:col-start-7 space-y-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-oxblood)] mb-6">
              About
            </p>
            <h2
              className="font-serif text-[40px] sm:text-[56px] leading-[1.08] text-[color:var(--site-charcoal)] mb-8"
              style={{ fontWeight: 300, letterSpacing: '-0.015em' }}
            >
              <span style={{ color: 'var(--site-oxblood)' }}>quiet care</span>
              <br />
              for flowers.
            </h2>
          </div>

          <div className="space-y-6 text-[15px] sm:text-base leading-[1.85] text-[color:var(--site-charcoal)]/80 max-w-lg font-light">
            <p>
              hazel은 한 다발에 담긴 공기를 중요하게 생각합니다. 과하게 꾸미지 않은 꽃,
              오래된 유럽의 정물처럼 공간에 머무는 식물을 엮습니다.
            </p>
            <p>
              부케, 공간 데코, 특별한 날의 선물 — 한 사람의 하루를 향해 고른 꽃들은
              언제나 조용하게, 그러나 깊이 있게 전해지기를 바랍니다.
            </p>
          </div>

          <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--site-pewter)]">
            <a
              href={HAZEL_LINKS.blog}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[color:var(--site-oxblood)]"
            >
              더 많은 이야기 →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
