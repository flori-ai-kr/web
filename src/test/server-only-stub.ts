// vitest 전용 'server-only' noop 스텁.
// 실제 빌드에선 Next가 server-only 패키지를 써서 클라이언트 번들 유입을 차단한다.
// 테스트(노드)에선 해당 패키지가 resolve 되지 않으므로 빈 모듈로 대체한다.
export {};
