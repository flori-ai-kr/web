# 목표
flori-ai-admin(web)의 단위 테스트 커버리지를 점진적으로 올린다. 최종 목표 라인 70%.

# 이번 루프에 할 일
1. `npm run test:coverage` 를 실행해 현재 커버리지 리포트를 읽는다.
2. 커버리지가 가장 낮은 파일 **딱 1개**를 고른다 (src/lib 또는 src/components 우선, I/O 래퍼보다 순수 로직 우선).
3. 그 파일의 핵심 분기·엣지케이스를 커버하는 Vitest 테스트를 작성한다 (행동 기반 assertion).
4. `npx vitest run <해당 테스트>` 가 통과할 때까지 수정한다.
5. `npx tsc --noEmit` 으로 타입 에러가 없는지 확인한다.
6. PROGRESS.md 에 "파일명 / 추가한 테스트 / 현재 커버리지%" 한 줄 append.
7. 작은 단위로 commit: `test(web): add tests for <file>`

# 완료조건 (EXIT_SIGNAL: true)
- 전체 라인 커버리지가 70% 이상이면 즉시 종료.
- 또는 더 이상 의미 있게 커버할 파일이 없으면 종료(Server Action I/O 래퍼·UI 컴포넌트만 남으면 사람 검수 영역).

# 금지
- 프로덕션 로직(컴포넌트/lib 구현)을 바꾸지 마라. 테스트만 추가.
- 한 루프에서 2개 이상 파일을 건드리지 마라.
- 스냅샷 테스트 남발 금지 — 동작 기반 assertion 위주.
- 실제 네트워크/외부 API 호출 금지 (전부 모킹).

# 안전 레일
- 전용 브랜치 `auto/test-coverage` 에서만 작업. 메인/dev 직접 금지.
- 자동 머지 금지 — 사람이 diff 리뷰 후 머지.
