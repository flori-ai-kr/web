# 사진 로딩 최적화 (A 스켈레톤+페이드인 / B CloudFront 캐시) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사진 렌더 화면의 "빈 카드"를 스켈레톤+페이드인으로 없애고(web), CloudFront 응답에 immutable 캐시 헤더를 주입해 재방문 비용을 0으로 만든다(aws-infra).

**Architecture:** (A) `next/image`를 감싸는 단일 공용 컴포넌트 `ImageWithSkeleton`을 만들어 모든 사진 렌더 지점에서 사용한다. 로딩 중 기존 `<Skeleton>`(쉬머)을 오버레이로 깔고 `onLoad` 시 페이드인한다. (B) Terraform으로 CloudFront에 Response Headers Policy(Cache-Control immutable, override) + 1년 TTL 커스텀 cache policy를 추가한다.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind v4 / Vitest + Testing Library (web). Terraform + AWS CloudFront (aws-infra).

## Global Constraints

- 파일명 kebab-case, 컴포넌트 심볼 PascalCase (프로젝트 컨벤션).
- `transition-all` 금지 → `transition-opacity` 사용 (UI 컨벤션).
- `next.config.ts`의 `images.unoptimized: true` 는 **변경 금지** (libvips OOM 회피).
- 모든 사진 렌더는 `next/image` 사용 유지 (단, `sale-photo-modal`의 로컬 blob 프리뷰는 예외 — 본문 참조).
- 커밋: `git add -A` 금지(변경 파일만 명시 추가). 메시지 말미에 `Co-Authored-By: Claude <noreply@anthropic.com>`.
- web 검증 명령: `npm test`(Vitest 1회), `npm run lint`(ESLint), `npx tsc --noEmit`(타입체크), `npm run build`(최종).
- aws-infra: `git add -A` 금지. `main`에서 직접 커밋(사용자 지시). apply 는 사용자 승인 하에.

**Image URL 사실**: 모든 이미지 키는 UUID 포함 불변 경로(`photo-cards/.../{uuid}-name`, `profiles/{userId}/{uuid}.ext`, `community/{userId}/{uuid}-name`). 같은 URL이 다른 내용으로 덮어써지지 않으므로 `immutable` 안전.

---

## Task 1: `ImageWithSkeleton` 공용 컴포넌트 (web)

**Files:**
- Create: `src/components/ui/image-with-skeleton.tsx`
- Test: `src/components/__tests__/image-with-skeleton.test.tsx`

**Interfaces:**
- Consumes: `Skeleton` from `@/components/ui/skeleton`, `cn` from `@/lib/utils`, `Image, ImageProps` from `next/image`, `ImageOff` from `lucide-react`.
- Produces: `export function ImageWithSkeleton(props: ImageProps & { wrapperClassName?: string })`. `next/image`의 모든 props(`src`,`alt`,`fill`,`width`,`height`,`sizes`,`priority`,`className`,`unoptimized`,`onLoad`,`onError`)를 패스스루한다. 후속 Task들이 `<Image .../>` 대신 이 컴포넌트로 교체한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/__tests__/image-with-skeleton.test.tsx`:

```tsx
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
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- image-with-skeleton`
Expected: FAIL — `ImageWithSkeleton` 모듈을 찾을 수 없음.

- [ ] **Step 3: 컴포넌트 구현**

`src/components/ui/image-with-skeleton.tsx`:

```tsx
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

  // 디스크 캐시에서 onLoad가 리스너 부착 전 발화해 스켈레톤이 영구히 남는 경우 대응
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setStatus('loaded');
    }
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- image-with-skeleton`
Expected: PASS (3 tests).

> 참고: 디스크 캐시 즉시-loaded 경로(useEffect)는 jsdom에서 `img.complete`를 신뢰성 있게 시뮬레이션할 수 없어 단위 테스트에서 제외한다. Task 7(브라우저 검증)에서 재방문 시 스켈레톤이 안 남는지 육안 확인한다.

- [ ] **Step 5: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/components/ui/image-with-skeleton.tsx src/components/__tests__/image-with-skeleton.test.tsx
git commit -m "feat(ui): ImageWithSkeleton 공용 컴포넌트 (스켈레톤+페이드인+에러폴백)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 적용 Task 공통 규칙 (Task 2~5)

각 적용 Task는 **순수 교체**다. 대상 파일을 읽고 다음을 적용한다:

1. import 교체: `import Image from 'next/image';` → `import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';`
   - 같은 파일에서 `Image`를 다른 별칭(`NextImage`)으로 쓰면 해당 별칭 사용처도 교체.
2. 사진을 렌더하는 `<Image ... />` 를 `<ImageWithSkeleton ... />` 로 교체. **모든 props(`src`,`alt`,`fill`,`width`,`height`,`sizes`,`priority`,`className`,`unoptimized`)를 그대로 유지**한다.
3. 빈 상태 폴백(이미지 없을 때 `ImageIcon` 등)은 건드리지 않는다 — `ImageWithSkeleton`은 `src`가 있을 때만 쓰인다.

검증(각 Task 끝): `npx tsc --noEmit && npm run lint && npm test`. 빌드는 최종 Task 7에서 일괄.

---

## Task 2: 갤러리 적용 (web)

**Files:**
- Modify: `src/app/(admin)/admin/gallery/components/photo-card.tsx`
- Modify: `src/app/(admin)/admin/gallery/components/photo-card-dialog.tsx`

**Interfaces:**
- Consumes: `ImageWithSkeleton` (Task 1).

- [ ] **Step 1: photo-card.tsx 교체**

`import Image from 'next/image';` → `import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';`

그리고 표지 이미지 블록을:

```tsx
<Image
  src={cover.url}
  alt={card.title}
  fill
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
/>
```

→ 로 교체:

```tsx
<ImageWithSkeleton
  src={cover.url}
  alt={card.title}
  fill
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
/>
```

(부모 `div`는 이미 `relative aspect-square overflow-hidden rounded-xl` → fill 모드 + `rounded-[inherit]` 스켈레톤이 그대로 동작.)

- [ ] **Step 2: photo-card-dialog.tsx 교체**

파일을 읽고 메인 이미지(약 104–111행, `fill` + `sizes="(max-width: 768px) 100vw, 768px"` + `priority={currentIndex === 0}`)와 썸네일 그리드(약 147–153행, `fill` + `sizes="64px"`)의 `<Image>` 두 곳을 공통 규칙대로 `<ImageWithSkeleton>`으로 교체. import 교체 포함. props 전부 유지(priority 포함).

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add "src/app/(admin)/admin/gallery/components/photo-card.tsx" "src/app/(admin)/admin/gallery/components/photo-card-dialog.tsx"
git commit -m "feat(gallery): 사진 카드/상세에 ImageWithSkeleton 적용

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: 매출 적용 (web)

**Files:**
- Modify: `src/app/(admin)/admin/sales/components/sales-list.tsx`
- Modify: `src/app/(admin)/admin/sales/components/sale-detail-dialog.tsx`
- Modify: `src/components/sales/sale-photo-modal.tsx`

**Interfaces:**
- Consumes: `ImageWithSkeleton` (Task 1).

- [ ] **Step 1: sales-list.tsx 교체**

파일을 읽고 썸네일 `<Image src={sale.photos![0]} alt="" fill sizes="84px" className="object-cover" />`(약 144–150행)를 공통 규칙대로 `<ImageWithSkeleton>`으로 교체. import 교체 포함.

- [ ] **Step 2: sale-detail-dialog.tsx 교체**

파일을 읽고 사진을 렌더하는 `<Image>`(들)을 공통 규칙대로 `<ImageWithSkeleton>`으로 교체. import 교체 포함. (라이트박스로 확대하는 트리거 이미지가 대상.)

- [ ] **Step 3: sale-photo-modal.tsx — 기존 원격 사진만 교체**

이 파일은 순수 `<img>`(약 424–428행)를 쓴다. **기존 업로드된 원격 사진만** 래퍼로 바꾸고, 로컬 blob 프리뷰는 그대로 둔다. 해당 `<img>` 블록을 조건 분기로 교체:

```tsx
<img
  src={item.type === 'existing' ? item.photo.url : item.preview}
  alt={`Photo ${index + 1}`}
  className="w-full h-full object-cover rounded-lg"
/>
```

→

```tsx
{item.type === 'existing' ? (
  <ImageWithSkeleton
    src={item.photo.url}
    alt={`Photo ${index + 1}`}
    fill
    sizes="(max-width: 768px) 25vw, 160px"
    className="object-cover rounded-lg"
  />
) : (
  // 로컬 blob 프리뷰: 즉시 로드라 스켈레톤 불필요
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={item.preview}
    alt={`Photo ${index + 1}`}
    className="w-full h-full object-cover rounded-lg"
  />
)}
```

import 추가: `import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';`. (부모 `div`는 이미 `relative aspect-square` → fill 동작. 기존에 `next/image` import가 없으면 새로 추가만.)

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add "src/app/(admin)/admin/sales/components/sales-list.tsx" "src/app/(admin)/admin/sales/components/sale-detail-dialog.tsx" "src/components/sales/sale-photo-modal.tsx"
git commit -m "feat(sales): 매출 사진(리스트/상세/모달)에 ImageWithSkeleton 적용

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: 고객 적용 (web)

**Files:**
- Modify: `src/app/(admin)/admin/customers/components/customer-card.tsx`
- Modify: `src/app/(admin)/admin/customers/components/customer-detail-dialog.tsx`

**Interfaces:**
- Consumes: `ImageWithSkeleton` (Task 1).

- [ ] **Step 1: customer-card.tsx 교체**

파일을 읽고 `customer.photo_thumbnails`(최대 6장)를 렌더하는 `<Image>`(들)을 공통 규칙대로 `<ImageWithSkeleton>`으로 교체. import 교체 포함.

- [ ] **Step 2: customer-detail-dialog.tsx 교체**

이 파일은 이미 `Skeleton`을 import한다(다른 용도일 수 있음 — 데이터 로딩 스켈레톤). **기존 `Skeleton` 사용처는 건드리지 말고**, 사진을 렌더하는 `<Image>`만 공통 규칙대로 `<ImageWithSkeleton>`으로 교체한다. `next/image` import 교체. (`Skeleton` import는 다른 곳에서 쓰면 유지.)

- [ ] **Step 3: 검증**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: 통과.

- [ ] **Step 4: 커밋**

```bash
git add "src/app/(admin)/admin/customers/components/customer-card.tsx" "src/app/(admin)/admin/customers/components/customer-detail-dialog.tsx"
git commit -m "feat(customers): 고객 연결 사진에 ImageWithSkeleton 적용

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: 커뮤니티 + 공용 라이트박스 적용 (web)

**Files:**
- Modify: `src/components/ui/image-lightbox.tsx`
- Modify: `src/app/(admin)/admin/community/[id]/community-detail-client.tsx`
- Modify(선택): `src/app/(admin)/admin/profile/profile-client.tsx`
- Modify(선택): `src/app/(admin)/admin/marketing/components/photo-picker.tsx`

**Interfaces:**
- Consumes: `ImageWithSkeleton` (Task 1).

- [ ] **Step 1: image-lightbox.tsx 교체 (고정 크기 모드)**

`import Image from 'next/image';` → `import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';`

메인 이미지 블록을:

```tsx
<Image
  key={src}
  src={src}
  alt={`${caption} 이미지 ${index + 1}`}
  width={1200}
  height={1200}
  sizes="(min-width: 1200px) 1200px, 95vw"
  className="max-h-[90vh] w-auto h-auto object-contain"
  priority
/>
```

→ 로 교체 (고정 크기 모드 → 자체 relative span 래퍼):

```tsx
<ImageWithSkeleton
  key={src}
  src={src}
  alt={`${caption} 이미지 ${index + 1}`}
  width={1200}
  height={1200}
  sizes="(min-width: 1200px) 1200px, 95vw"
  className="max-h-[90vh] w-auto h-auto object-contain"
  wrapperClassName="flex items-center justify-center"
  priority
/>
```

- [ ] **Step 2: community-detail-client.tsx 교체**

파일을 읽고 게시글 본문/첨부 이미지를 렌더하는 `<Image>`(들)을 공통 규칙대로 `<ImageWithSkeleton>`으로 교체. import 교체 포함. (라이트박스 트리거 썸네일이 대상. 라이트박스 자체는 Step 1에서 처리됨.)

- [ ] **Step 3 (선택): profile-client.tsx, photo-picker.tsx 교체**

시간이 되면: 프로필 아바타 `<Image>` 와 마케팅 `photo-picker`의 `<Image ... unoptimized />`(64px)를 공통 규칙대로 교체(`unoptimized` prop 유지). 우선순위 낮음 — 건너뛰어도 됨.

- [ ] **Step 4: 검증**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: 통과.

- [ ] **Step 5: 커밋**

```bash
git add "src/components/ui/image-lightbox.tsx" "src/app/(admin)/admin/community/[id]/community-detail-client.tsx"
# 선택 항목을 했다면 함께 add
git commit -m "feat(community): 커뮤니티/라이트박스 사진에 ImageWithSkeleton 적용

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: CloudFront 캐시 헤더 (aws-infra, Terraform)

**Files:**
- Modify: `/Users/hansangho/Desktop/aws-infra/flori-ai-tf/cloudfront.tf`
- Modify: `/Users/hansangho/Desktop/aws-infra/flori-ai-tf/prod-cloudfront.tf`

**Interfaces:**
- Produces: `aws_cloudfront_cache_policy.images_long_ttl`, `aws_cloudfront_response_headers_policy.images_immutable` (계정 전역 공유 정책, cloudfront.tf 정의). dev/prod 두 distribution이 참조.

> 이 Task는 인프라 변경이라 TDD가 아니다. `terraform validate`/`plan`이 검증 단계다. **apply 는 사용자 승인 하에** 수행한다.

- [ ] **Step 1: cloudfront.tf — 공유 정책 추가 + 관리형 data source 제거**

`data "aws_cloudfront_cache_policy" "caching_optimized" { name = "Managed-CachingOptimized" }` 블록(19–22행)을 삭제하고, 그 자리에 아래를 추가:

```hcl
# 이미지 1년 TTL 캐시 정책 — 엣지 TTL 1년 (UUID 불변 키이므로 안전). dev/prod 공유.
resource "aws_cloudfront_cache_policy" "images_long_ttl" {
  name        = "flori-images-1yr"
  comment     = "Long TTL for immutable image objects (UUID keys)"
  min_ttl     = 1
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# 응답 헤더 정책 — 브라우저에 immutable Cache-Control 주입. 캐시 히트에도 매 응답 적용 → 기존 객체 즉시 소급. dev/prod 공유.
resource "aws_cloudfront_response_headers_policy" "images_immutable" {
  name    = "flori-images-immutable"
  comment = "Force immutable Cache-Control on image responses"

  custom_headers_config {
    items {
      header   = "Cache-Control"
      value    = "public, max-age=31536000, immutable"
      override = true
    }
  }
}
```

- [ ] **Step 2: cloudfront.tf — dev distribution 동작 갱신**

`aws_cloudfront_distribution.images`의 `default_cache_behavior`에서:

```hcl
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
```

→ 두 줄로 교체:

```hcl
    cache_policy_id            = aws_cloudfront_cache_policy.images_long_ttl.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.images_immutable.id
```

- [ ] **Step 3: prod-cloudfront.tf — prod distribution 동작 갱신**

`aws_cloudfront_distribution.images_prod`의 `default_cache_behavior`에서:

```hcl
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
```

→ 두 줄로 교체:

```hcl
    cache_policy_id            = aws_cloudfront_cache_policy.images_long_ttl.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.images_immutable.id
```

- [ ] **Step 4: fmt + validate + plan**

```bash
cd /Users/hansangho/Desktop/aws-infra/flori-ai-tf
terraform fmt
terraform validate
terraform plan
```

Expected: validate 성공. plan에 새 리소스 2개(cache policy, response headers policy) 생성 + 두 distribution 업데이트(in-place). 다른 리소스 변경/삭제 없음.

> plan 결과를 사용자에게 보여주고 검토받는다. **이상 없으면** 다음 단계로.

- [ ] **Step 5: dev 먼저 apply (사용자 승인)**

```bash
terraform apply \
  -target=aws_cloudfront_cache_policy.images_long_ttl \
  -target=aws_cloudfront_response_headers_policy.images_immutable \
  -target=aws_cloudfront_distribution.images
```

CloudFront 배포 업데이트 수 분 소요(Deployed 될 때까지).

- [ ] **Step 6: dev 검증**

브라우저 DevTools 또는 갤러리에서 실제 이미지 URL 하나를 골라:

```bash
curl -sI "https://d2u9ujcp5in43y.cloudfront.net/<실제-객체-키>" | grep -i cache-control
```

Expected: `cache-control: public, max-age=31536000, immutable`

- [ ] **Step 7: 나머지(prod) apply (사용자 승인)**

```bash
terraform apply
```

Expected: prod distribution in-place 업데이트만 남음.

- [ ] **Step 8: 커밋 (aws-infra main, 변경 파일만)**

```bash
cd /Users/hansangho/Desktop/aws-infra
git add flori-ai-tf/cloudfront.tf flori-ai-tf/prod-cloudfront.tf
git commit -m "feat(cloudfront): 이미지 immutable 캐시 헤더 + 1년 TTL (dev/prod)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: 최종 빌드 + 브라우저 검증 (web)

**Files:** (변경 없음 — 검증 전용)

- [ ] **Step 1: 전체 빌드**

Run: `npm run build`
Expected: 성공(타입/린트 에러 없음).

- [ ] **Step 2: 전체 테스트**

Run: `npm test`
Expected: 전체 통과(신규 `image-with-skeleton` 포함).

- [ ] **Step 3: 브라우저 육안 확인 (dev)**

`npm run dev` 후:
- 갤러리/매출/고객 진입 시 사진 자리에 **스켈레톤 쉬머 → 페이드인** 동작(빈 카드 없음).
- 같은 페이지 재진입 시 **스켈레톤이 영구히 남지 않음**(디스크 캐시 즉시-loaded 경로 동작).
- 라이트박스 확대 시 정상 표시.
- 깨진 URL(임시로 잘못된 src) 시 `ImageOff` 폴백(선택 확인).

---

## Self-Review (작성자 점검 결과)

**1. Spec coverage:**
- A-1 공용 컴포넌트 → Task 1 ✅
- A-2 적용 대상(gallery/sales/customers/community/lightbox/sale-photo-modal/선택 profile·photo-picker) → Task 2~5 ✅
- A-1 캐시된 이미지 대응(useEffect) → Task 1 구현 + Task 7 육안 검증 ✅
- A-1 에러 폴백 → Task 1 ✅
- B-2 Response Headers Policy + 1년 cache policy(dev/prod) → Task 6 ✅
- B-4 검증(curl) → Task 6 Step 6 ✅

**2. Placeholder scan:** "선택" 항목(profile/photo-picker)은 명시적 후순위로 표기, 코드/규칙은 구체 제공 — 미정 플레이스홀더 아님.

**3. Type consistency:** 컴포넌트명 `ImageWithSkeleton`, prop `wrapperClassName`, data-slot `skeleton`/`image-error` 가 컴포넌트 정의·테스트·적용 Task 전반에서 일치 ✅. Terraform 리소스명 `images_long_ttl`/`images_immutable` 가 정의·참조에서 일치 ✅.
