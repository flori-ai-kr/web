'use client';

import {useState} from 'react';
import Image from 'next/image';

// Feature 화면 미리보기 — 이미지 1장이면 그냥 표시, 2장 이상이면 좌우 버튼+점 캐러셀.
// 이미지는 public/landing/*.png (4:3 권장). reversed면 그리드에서 좌측으로 배치(order:-1).
export function FeatureCarousel({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [idx, setIdx] = useState(0);
  const multi = images.length > 1;
  const go = (d: number) => setIdx((p) => (p + d + images.length) % images.length);

  return (
    <div className="feat-visual" style={{position: 'relative'}}>
      <div
        className="feat-frame"
        style={{
          position: 'relative',
          aspectRatio: '4/3',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--site-line)',
          boxShadow: '0 24px 48px -28px rgba(40,30,40,.28)',
          background: '#fff',
        }}
      >
        <Image
          src={images[idx]}
          alt={`${title} 화면 미리보기 ${idx + 1}`}
          fill
          sizes="(max-width: 880px) 92vw, 520px"
          // 캡처 이미지를 같은 파일명으로 자주 교체하므로 최적화 캐시를 끈다(파일만 바꿔도 즉시 반영).
          unoptimized
          style={{objectFit: 'cover', objectPosition: 'top left'}}
        />
      </div>

      {multi && (
        <>
          <button
            type="button"
            aria-label="이전 화면"
            onClick={() => go(-1)}
            style={{...arrowStyle, left: '10px'}}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="다음 화면"
            onClick={() => go(1)}
            style={{...arrowStyle, right: '10px'}}
          >
            ›
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`${i + 1}번째 화면 보기`}
                aria-current={i === idx}
                onClick={() => setIdx(i)}
                style={{
                  width: i === idx ? '18px' : '7px',
                  height: '7px',
                  borderRadius: '99px',
                  border: 'none',
                  cursor: 'pointer',
                  background: i === idx ? 'var(--site-accent)' : 'rgba(28,32,36,.22)',
                  transition: 'width .2s ease',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const arrowStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '38px',
  height: '38px',
  borderRadius: '99px',
  border: '1px solid var(--site-line)',
  background: 'rgba(255,255,255,.92)',
  color: 'var(--site-accent-deep)',
  fontSize: '22px',
  lineHeight: 1,
  cursor: 'pointer',
  boxShadow: '0 6px 16px -8px rgba(40,30,40,.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
