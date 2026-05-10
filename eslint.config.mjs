import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node.js scripts (CommonJS)
    "scripts/**",
  ]),
  {
    // React 19 ESLint plugin이 새로 추가한 룰들은 기존 코드 패턴과 충돌이 많아
    // 일괄 warn으로 다운그레이드. 점진적 마이그레이션 후 error로 승격 예정.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]);

export default eslintConfig;
