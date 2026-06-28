import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';

describe('ImageWithSkeleton', () => {
  it('로딩 중에는 스켈레톤을 보여주고 이미지는 투명하다', () => {
    const { container } = render(
      <ImageWithSkeleton src="/test.jpg" alt="테스트 이미지" width={100} height={100} />,
    );
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
    expect(screen.getByRole('img')).toHaveClass('opacity-0');
  });

  it('로드 완료되면 스켈레톤이 사라지고 이미지가 페이드인된다', () => {
    const { container } = render(
      <ImageWithSkeleton src="/test.jpg" alt="테스트 이미지" width={100} height={100} />,
    );
    fireEvent.load(screen.getByRole('img'));
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(screen.getByRole('img')).toHaveClass('opacity-100');
  });

  it('로드 실패하면 에러 폴백을 보여주고 스켈레톤은 사라진다', () => {
    const { container } = render(
      <ImageWithSkeleton src="/broken.jpg" alt="깨진 이미지" width={100} height={100} />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(container.querySelector('[data-slot="image-error"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it('fill 모드에서는 래퍼 span 없이 img가 직접 렌더된다', () => {
    const { container } = render(
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <ImageWithSkeleton src="/test.jpg" alt="fill 이미지" fill />
      </div>,
    );
    expect(container.querySelector('span.relative.inline-block')).toBeNull();
    expect(screen.getByRole('img')).toBeTruthy();
  });
});
