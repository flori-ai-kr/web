---
작성일: 2026-05-04
소스: CLAUDE.md + docs/ARCHITECTURE.md + Phase 1 분석
대상 독자: 개발자 + AI 에이전트
---

# 데이터 흐름

## 매출 등록 시퀀스

사진이 있는 매출 등록의 전체 흐름이다.

```mermaid
sequenceDiagram
    participant User as 사용자
    participant Dialog as SaleFormDialog
    participant Compress as browser-image-compression
    participant SA_Photo as uploadSalePhotos()
    participant R2 as Cloudflare R2
    participant SA_Sale as createSale()
    participant Auth as requireAuth()
    participant Zod as validations.ts
    participant DB as Supabase PostgreSQL
    participant Client as sales-client.tsx

    User->>Dialog: 매출 정보 입력 + 사진 선택
    Dialog->>Compress: 3MB 초과 이미지 압축
    Compress-->>Dialog: 압축된 파일

    Dialog->>SA_Photo: uploadSalePhotos(files)
    SA_Photo->>Auth: requireAuth()
    Auth-->>SA_Photo: user
    SA_Photo->>R2: PutObjectCommand (S3 호환)
    R2-->>SA_Photo: CDN URL
    SA_Photo-->>Dialog: photo_urls[]

    Dialog->>SA_Sale: createSale({ ...formData, photo_urls })
    SA_Sale->>Auth: requireAuth()
    Auth-->>SA_Sale: user
    SA_Sale->>Zod: CreateSaleSchema.parse(input)
    Zod-->>SA_Sale: validated data
    SA_Sale->>DB: INSERT INTO sales (user_id=user.id, ...)
    DB->>DB: RLS: auth.uid() = user_id 검증
    DB-->>SA_Sale: 생성된 sale
    SA_Sale-->>Dialog: sale

    Dialog-->>Client: 다이얼로그 닫기
    Client->>Client: router.refresh()
    Client->>DB: 최신 sales 목록 재조회 (page.tsx)
    DB-->>Client: 갱신된 목록
```

핵심 포인트:
- 사진 업로드와 매출 생성이 분리된 두 번의 Server Action 호출이다
- `user_id: user.id`는 Server Action에서 삽입 — 클라이언트가 전달하지 않음
- 변경 후 `router.refresh()`로 서버 재조회 — 클라이언트 캐시 없음

## 푸시 알림 시퀀스

일별 예약 요약 푸시 흐름 (매일 08:00 KST).

```mermaid
sequenceDiagram
    participant Vercel as Vercel Cron
    participant Cron as /api/cron/daily-reminder
    participant DB as Supabase PostgreSQL
    participant PB as push-broadcast.ts
    participant WP as Web Push (VAPID)
    participant SW as Service Worker (sw.js)
    participant OS as 운영체제
    participant Browser as 브라우저

    Vercel->>Cron: GET 08:00 KST (23:00 UTC)
    Cron->>DB: 오늘 예약 목록 조회
    DB-->>Cron: reservations[]
    Cron->>DB: push_subscriptions WHERE active=true
    DB-->>Cron: subscriptions[]

    loop 각 구독자
        Cron->>PB: broadcastPush(subscriptions, payload)
        PB->>WP: webpush.sendNotification(sub, payload)
        WP->>SW: push event
        SW->>OS: showNotification('오늘 예약 N건')
        OS-->>Browser: 알림 표시
    end

    Note over PB,WP: 404/410 응답 시 해당 구독 비활성화
    Note over PB,WP: 일시 에러는 구독 유지

    Browser->>SW: 알림 클릭
    SW->>Browser: clients.matchAll() → /admin/calendar 이동
```

실패 처리: `web-push` 라이브러리가 푸시 서버로부터 404(구독 없음)·410(구독 만료) 응답을 받으면 `push_subscriptions.active = false`로 업데이트한다. 네트워크 일시 에러는 재시도 없이 다음 Cron 실행을 기다린다.

## 인사이트 수집 시퀀스

RemoteTrigger가 Apify를 통해 인스타그램 포스트를 수집하고 사용자에게 푸시하는 흐름이다.

```mermaid
sequenceDiagram
    participant RT as RemoteTrigger\n(Mon/Fri 08:00 KST)
    participant IR as /api/internal/instagram
    participant IA as internal-auth.ts
    participant SVC as supabase/service.ts\n(Service Role)
    participant DB as Supabase PostgreSQL
    participant PB as push-broadcast.ts
    participant WP as Web Push

    RT->>IR: POST Bearer INTERNAL_API_KEY\n{ actor_run_id: "..." }
    IR->>IA: verifyInternalAuth(request)
    IA->>IA: timingSafeEqual(key, INTERNAL_API_KEY)
    IA-->>IR: 검증 통과

    IR->>SVC: getServiceRoleClient()
    IR->>DB: SELECT FROM instagram_posts\n(최신 포스트 확인)
    IR->>IR: Apify Actor 결과 fetch
    IR->>SVC: INSERT INTO instagram_posts\n(Service Role — RLS 우회)
    SVC->>DB: 공유 테이블 쓰기
    DB-->>IR: 삽입된 포스트 수

    IR->>PB: broadcastPush(all_subscriptions, '새 인스타그램 포스트')
    PB->>WP: VAPID 푸시 발송
    IR-->>RT: { inserted: N }
```

핵심 포인트:
- `instagram_posts`는 공유 테이블이므로 Service Role로만 쓸 수 있다
- 일반 Server Action의 `requireAuth()` + user-scoped 패턴이 아닌, Bearer 토큰 + Service Role 경로
- 수집 성공 후 전체 활성 구독자에게 알림 브로드캐스트

## 인증 흐름

페이지 접근부터 Server Action 실행까지 인증이 검증되는 전체 경로이다.

```mermaid
sequenceDiagram
    participant Browser
    participant MW as middleware.ts
    participant SB_MW as supabase/middleware.ts\ncreateServerClient()
    participant Page as page.tsx (Server Component)
    participant SB_SRV as supabase/server.ts\ncreateServerClient()
    participant AG as auth-guard.ts\nrequireAuth()
    participant SA as Server Action
    participant RLS as Supabase RLS

    Browser->>MW: GET /admin/sales
    MW->>SB_MW: getUser() — 쿠키에서 세션 검증
    SB_MW-->>MW: user | null

    alt 미인증
        MW-->>Browser: 302 → /login
    else 인증됨
        MW->>MW: 응답 쿠키 갱신 (세션 연장)
        MW->>Page: 통과

        Page->>SB_SRV: createServerClient() → getUser()
        SB_SRV-->>Page: user
        Page->>AG: requireAuth()
        AG-->>Page: user (또는 AppError throw)
        Page->>RLS: SELECT * FROM sales WHERE user_id = auth.uid()
        RLS-->>Page: 본인 데이터만 반환
        Page-->>Browser: HTML (초기 데이터 포함)

        Browser->>SA: createSale() 호출
        SA->>AG: requireAuth()
        AG-->>SA: user
        SA->>RLS: INSERT INTO sales (user_id=user.id, ...)
        RLS->>RLS: auth.uid() = user_id 검증
        RLS-->>SA: 삽입 완료
        SA-->>Browser: 성공
    end
```

세션 갱신 메커니즘: `middleware.ts`가 매 요청마다 `getUser()`를 호출하면 Supabase SSR이 만료 임박 토큰을 자동 갱신하고 새 쿠키를 응답에 세팅한다. 클라이언트는 별도 처리 없이 항상 유효한 세션을 유지한다.

관련 문서: [코드맵 개요](./overview.md) | [엔트리포인트](./entry-points.md) | [프로젝트 구조](../structure.md)
