# 사진 로딩 최적화 — A. 스켈레톤+페이드인 / B. CloudFront 캐시 헤더

- 작성일: 2026-06-26
- 범위: web(`flori-ai/web`) + aws-infra(Terraform). **썸네일(C 레버)은 별도 스펙**으로 분리한다.
- 배경 분석: 메모리 `flori-photo-perf`.

## 문제

갤러리/매출/고객 등 사진이 나오는 화면에서:

1. **빈 카드** — 로딩 중 플레이스홀더가 전혀 없다. `next/image`는 priority가 아닌 경우 기본 lazy 로딩이지만, 로딩되는 동안 빈 공간만 보인다(스크린샷의 빈 카드 문제).
2. **재조회 비용** — CloudFront(`d2u9ujcp5in43y.cloudfront.net`) 객체에 `Cache-Control` 헤더가 없어, 브라우저가 재방문/재진입마다 다시 받아온다(엣지 기본 TTL 1일).

> 풀사이즈 원본을 작은 자리에 받는 진짜 병목(썸네일 부재)은 C 레버(별도 스펙)에서 다룬다. 본 스펙은 "로딩 표시"와 "캐시"만 다룬다.

## 비목표 (이번 스펙 제외)

- 썸네일 생성/리사이즈 (C 레버, 별도 스펙).
- `next.config.ts` `images.unoptimized: true` 변경 — OOM(libvips) 회피를 위해 그대로 유지한다.
- Instagram/Unsplash 등 외부 CDN 이미지의 캐시(본 CloudFront 미경유).

---

## A. 스켈레톤 + 페이드인 (web only)

### A-1. 공용 래퍼 컴포넌트

**파일**: `src/components/ui/image-with-skeleton.tsx`
**심볼**: `ImageWithSkeleton`

`next/image`(`<Image>`)를 감싸는 단일 컴포넌트. 로딩 동안 기존 `<Skeleton>`(쉬머) 오버레이를 보여주고, 로드 완료 시 이미지를 페이드인한다.

#### Props

기본적으로 `next/image`의 props를 패스스루하되 아래를 명시 지원한다.

| prop | 의미 |
|------|------|
| `src`, `alt` | 필수. next/image 그대로 |
| `fill` | `fill` 모드(그리드/카드). 부모가 `relative`+사이즈 보유 |
| `width`, `height` | 고정 크기 모드(라이트박스 등). `fill`과 배타 |
| `sizes`, `priority`, `className` | next/image 그대로 패스스루 |
| `wrapperClassName` | 래퍼 div 클래스(레이아웃 미세조정용, 선택) |

> `unoptimized`는 next.config 전역(`unoptimized:true`)을 따른다. 개별 지정이 필요하면 패스스루로 받는다(예: photo-picker가 명시).

#### 동작

1. 내부 상태 `status: 'loading' | 'loaded' | 'error'`.
2. **로딩 중**(`status==='loading'`): `<Skeleton className="absolute inset-0 ...">` 오버레이(부모 모서리 둥글기 상속). 이미지는 `opacity-0`.
3. **로드 완료**(`onLoad`): `status='loaded'`. 이미지 `opacity-100`, `transition-opacity`로 페이드인. 스켈레톤 제거.
4. **에러**(`onError`): `status='error'`. muted 배경 박스 + `ImageOff`(lucide) 아이콘. 이미지/스켈레톤 숨김.
5. **캐시된 이미지 대응**(중요): 마운트 직후 `useEffect`에서 `imgRef.current?.complete && naturalWidth>0` 이면 즉시 `status='loaded'`로 설정. 브라우저 디스크 캐시에서 `onLoad`가 리스너 부착 전 발화해 스켈레톤이 영구히 남는 버그를 방지한다.
6. `priority` 이미지도 동일 로직(스켈레톤은 잠깐 보일 수 있으나 무해).

#### 레이아웃 모드

- **fill 모드**: 래퍼 `relative w-full h-full`(또는 부모가 사이즈를 주는 구조 유지). Skeleton `absolute inset-0`, Image `fill object-cover`(호출부 className 유지).
- **고정 크기 모드**: 래퍼 `relative inline-block`. Skeleton `absolute inset-0`. Image `width/height` + 호출부 className(`object-contain` 등). 라이트박스는 `object-contain`이라 박스보다 작게 렌더될 수 있으므로 스켈레톤은 래퍼(이미지 본래 박스) 기준으로 깐다.

#### 테스트 (Vitest + Testing Library)

- 초기 렌더 시 스켈레톤(`data-slot="skeleton"`) 존재 + 이미지 `opacity-0`.
- `onLoad` 발화 후 스켈레톤 사라지고 이미지 `opacity-100`.
- `onError` 발화 후 에러 폴백(아이콘) 렌더.
- 마운트 시 `img.complete===true`(캐시 가정)면 스켈레톤 없이 바로 `loaded`.

### A-2. 적용 대상

아래 모든 사진 렌더를 `ImageWithSkeleton`으로 교체한다. 각 호출부의 기존 `fill`/`sizes`/`priority`/`className`은 그대로 옮긴다.

| 영역 | 파일 | 비고 |
|------|------|------|
| 갤러리 카드 | `app/(admin)/admin/gallery/components/photo-card.tsx` | fill, sizes 유지 |
| 갤러리 상세 | `app/(admin)/admin/gallery/components/photo-card-dialog.tsx` | 메인 이미지 + 썸네일 그리드 둘 다 |
| 매출 리스트 | `app/(admin)/admin/sales/components/sales-list.tsx` | fill, sizes="84px" |
| 매출 상세 | `app/(admin)/admin/sales/components/sale-detail-dialog.tsx` | |
| 매출 사진 모달 | `components/sales/sale-photo-modal.tsx` | 순수 `<img>` → 기존 원격 사진(`item.photo.url`)은 래퍼로. 로컬 blob 프리뷰(`item.preview`)는 즉시 로드라 그대로 두거나 래퍼(무해) |
| 고객 카드 | `app/(admin)/admin/customers/components/customer-card.tsx` | `photo_thumbnails` 목록 |
| 고객 상세 | `app/(admin)/admin/customers/components/customer-detail-dialog.tsx` | 기존 Skeleton import 정리 |
| 커뮤니티 상세 | `app/(admin)/admin/community/[id]/community-detail-client.tsx` | |
| 공용 라이트박스 | `components/ui/image-lightbox.tsx` | width/height=1200, priority 유지(고정 크기 모드) |
| 프로필 아바타(선택) | `app/(admin)/admin/profile/profile-client.tsx` | 후순위 |
| 마케팅 선택기(선택) | `app/(admin)/admin/marketing/components/photo-picker.tsx` | `unoptimized` 명시 패스스루, 후순위 |

> "선택" 항목은 단발성/소형이라 1차 적용 후 시간이 되면 포함. 핵심은 그리드/리스트/라이트박스.

### A-3. 제약·관례

- 파일명 kebab-case, 심볼 PascalCase (프로젝트 컨벤션).
- `transition-all` 금지 → `transition-opacity` 사용.
- 접근성: `alt` 필수 유지. 에러 폴백에도 `alt` 텍스트/aria 유지.
- 한국어 UI 규칙 영향 없음(텍스트 거의 없음).

---

## B. CloudFront 캐시 헤더 (aws-infra Terraform)

### B-1. 현황

- IaC: Terraform (`aws-infra/flori-ai-tf/`). dev = `*.tf`, prod = `prod-*.tf` 오버레이.
- 이미지 CloudFront: `cloudfront.tf`(dev) / `prod-cloudfront.tf`(prod). S3 origin(OAC), `default_cache_behavior`가 AWS 관리형 `Managed-CachingOptimized` cache policy 사용.
- **Response Headers Policy 없음**, S3 객체 `Cache-Control` 없음 → 브라우저 캐시 미지정, 엣지 기본 TTL 1일.

### B-2. 변경

`cloudfront.tf`와 `prod-cloudfront.tf` 각각에:

1. **Response Headers Policy 추가**
   - `resource "aws_cloudfront_response_headers_policy"` (dev/prod 분리, 이름 충돌 방지).
   - `custom_headers_config`: `Cache-Control = "public, max-age=31536000, immutable"`, `override = true`.
   - distribution `default_cache_behavior.response_headers_policy_id`에 연결.
   - 효과: CloudFront가 **캐시 히트/미스 무관하게 응답마다** 헤더 주입 → 기존 사진 즉시 소급, invalidation 불필요. 브라우저가 1년 디스크 캐시 + immutable로 재검증 생략.

2. **엣지 TTL 1년** (선택적 강화)
   - 커스텀 cache policy(`min_ttl=1`, `default_ttl=31536000`, `max_ttl=31536000`, 쿼리/헤더/쿠키 캐시키 제외)로 교체하거나, `Managed-CachingOptimized` 유지(엣지 1일 재검증, 동일 리전 S3라 비용 미미).
   - 권장: 커스텀 cache policy로 엣지도 1년. 브라우저 측 이득(RHP)이 사용자 체감의 핵심이므로 RHP는 필수, cache policy 교체는 강화.

### B-3. 안전성

- 모든 이미지 키가 UUID 포함 불변 경로(`photo-cards/.../{uuid}-name`, `profiles/{userId}/{uuid}.ext`, `community/{userId}/{uuid}-name` 등). 같은 URL이 다른 내용으로 덮어써지지 않음 → `immutable` 안전.
- 프로필 사진 변경 시 새 UUID 키 발급(URL 교체) → 캐시 무관.

### B-4. 적용·검증

- aws-infra `main`에서 직접 커밋(사용자 지시). `terraform fmt` → `validate` → `plan`(리뷰) → `apply`(사용자 승인). **dev 먼저** 적용·검증 후 prod.
- CloudFront 배포 업데이트는 수 분 소요(In Progress→Deployed).
- 검증: `curl -I https://d2u9ujcp5in43y.cloudfront.net/<기존-객체-키>` 응답에 `cache-control: public, max-age=31536000, immutable` 확인. 브라우저 DevTools에서 재진입 시 `(disk cache)` / `200 (from disk cache)` 확인.

---

## 산출물 요약

| 레버 | 레포 | 핵심 변경 |
|------|------|-----------|
| A | web | `ImageWithSkeleton` 신설 + 사진 렌더 10여 곳 교체 + 단위 테스트 |
| B | aws-infra | dev/prod CloudFront에 Response Headers Policy(+커스텀 cache policy) 추가, apply |

## 후속 (별도 스펙)

- **C 레버 — 썸네일**: 생성 위치(① S3 PUT 트리거 Lambda(sharp) ② CloudFront 동적 리사이즈 ③ api) 결정부터. 기존 사진 백필(S3 HEAD로 size 채우기 → 스토리지 쿼터 0MB 문제도 해소). 관련 메모리 `flori-storage-quota`.
