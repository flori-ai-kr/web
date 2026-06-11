// 도메인별 타입의 배럴(re-export).
// 신규 코드는 도메인 파일(@/types/sales 등)을 직접 import해도 되고,
// 기존 코드 호환을 위해 이 경로(@/types/database)도 유지한다.
export * from './sales';
export * from './expenses';
export * from './customers';
export * from './gallery';
export * from './reservations';
export * from './insights';
export * from './community';
export * from './user';
