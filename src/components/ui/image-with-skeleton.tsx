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

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      setStatus('loaded');
      return;
    }

    // next/image가 React onLoad를 포워딩하지 않는 환경(jsdom) 대비 네이티브 폴백
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
        onLoad={(e) => {
          setStatus('loaded');
          onLoad?.(e);
        }}
        onError={(e) => {
          setStatus('error');
          onError?.(e);
        }}
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
