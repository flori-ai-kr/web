import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // next/core-web-vitals는 jsx-a11y 플러그인을 등록하지만 일부 룰만 켠다.
  // 플러그인은 이미 등록돼 있으므로(재등록 시 충돌) recommended 핵심 룰을 추가로 활성화한다.
  // 기존 코드와 충돌이 많아 warn으로 점진 도입(아래 React 19 룰 다운그레이드와 동일 철학).
  {
    files: ["**/*.{jsx,tsx}"],
    rules: {
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-has-content": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/aria-activedescendant-has-tabindex": "warn",
      "jsx-a11y/autocomplete-valid": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "warn",
      "jsx-a11y/iframe-has-title": "warn",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/mouse-events-have-key-events": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-tabindex": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/tabindex-no-positive": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node.js scripts (CommonJS)
    "scripts/**",
    // Claude Code 세션 worktree 잔여물 (내부 .next 빌드 산출물이 lint를 오염시킴)
    ".claude/**",
    // Playwright 산출물
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    // React 19 ESLint plugin이 새로 추가한 룰들은 기존 코드 패턴과 충돌이 많아
    // 일괄 warn으로 다운그레이드. 점진적 마이그레이션 후 error로 승격 예정.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      // `_` 접두사는 "의도적으로 안 쓰는 값" 관례 (property 테스트의 미사용 인자 등)
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
]);

export default eslintConfig;
