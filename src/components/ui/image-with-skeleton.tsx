'use client';

import { useEffect, useRef, useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { ImageOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Status = 'loading' | 'loaded' | 'error';

export type ImageWithSkeletonProps = ImageProps & {
  /** 고정 크기 모드에서 래퍼 span에 적용할 클래스 (선택) */
  wrapperClassName?: string;
};

/**
 * next/image 래퍼 — 로딩 중 스켈레톤(쉬머) 오버레이 + onLoad 페이드인 + onError 폴백.
 * fill 모드: positioned 부모에 직접 얹기 위해 Fragment 반환.
 * 고정 크기 모드: 자체 relative span 래퍼 제공.
 *
 * 내부 status 감지는 native addEventListener(useEffect, deps=[])로 처리한다:
 * 1) 디스크 캐시에서 load 이벤트가 React 합성 이벤트 부착 전에 발화해도 스켈레톤이 남지 않는다.
 * 2) jsdom 테스트에서 fireEvent.load/error 가 act() 내부에서 동기적으로 상태를 전이시킨다.
 * 사용자 onLoad/onError 콜백은 <Image> props로 정상 패스스루해 next/image 내부 경로(blur 제거 등)를 보존한다.
 */
export function ImageWithSkeleton({
  className,
  wrapperClassName,
  fill,
  onLoad,
  onError,
  alt,
  ...rest
}: ImageWithSkeletonProps) {
  const [status, setStatus] = useState<Status>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  // native 리스너는 setStatus 전용 — 마운트 시 1회만 부착(deps=[])
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // 디스크 캐시에서 onLoad가 리스너 부착 전 발화해 스켈레톤이 영구히 남는 경우 대응
    if (img.complete && img.naturalWidth > 0) {
      setStatus('loaded');
      return;
    }

    const handleLoad = () => setStatus('loaded');
    const handleError = () => setStatus('error');

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, []);

  if (status === 'error') {
    const errorBox = (
      <div
        data-slot="image-error"
        role="img"
        aria-label={alt}
        className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-muted"
      >
        <ImageOff className="h-6 w-6 text-muted-foreground/50" aria-hidden />
      </div>
    );
    return fill ? (
      errorBox
    ) : (
      <span className={cn('relative inline-block', wrapperClassName)}>{errorBox}</span>
    );
  }

  const content = (
    <>
      {status === 'loading' && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-[inherit]" />
      )}
      <Image
        {...rest}
        ref={imgRef}
        alt={alt}
        fill={fill}
        onLoad={onLoad}
        onError={onError}
        className={cn(
          'transition-opacity duration-300',
          status === 'loaded' ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
    </>
  );

  return fill ? (
    content
  ) : (
    <span className={cn('relative inline-block', wrapperClassName)}>{content}</span>
  );
}
