// BFF JWT 쿠키 이름 상수.
// next/headers에 의존하지 않으므로 미들웨어(Edge)에서도 안전하게 import 가능.
export const ACCESS_COOKIE = 'flori_access';
export const REFRESH_COOKIE = 'flori_refresh';
// OAuth(카카오 등) CSRF 방지용 state 쿠키. 개시 라우트에서 쓰고 콜백에서 검증·삭제.
export const OAUTH_STATE_COOKIE = 'flori_oauth_state';
// 소셜 신규 유저 가입 토큰 쿠키. 콜백(미가입)에서 쓰고 register/complete에서 자격증명으로 쓴 뒤 삭제.
export const REGISTER_COOKIE = 'flori_register';
