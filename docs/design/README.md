# docs/design/

flori 어드민의 디자인 원본과 컨텍스트 문서를 보관하는 디렉터리.

## 구성

| 파일/폴더 | 역할 |
|---|---|
| `flori-admin.pen` | **Pencil 디자인 원본** (어드민 화면 미러) — Pencil 앱에서 열어 편집 |
| `research.md` | 경쟁사 분석, 사용자 인사이트, 채택/회피 패턴 |
| `system.md` | 디자인 토큰, 타이포그래피, 간격, 접근성 규칙 |
| `spec.md` | 정보 구조(IA), 화면별 스펙 |
| `claude-design-brief.md` | 디자인 브리프 |
| `copy-candidates.md` | 카피 후보 |
| `curated-shots.md` | 큐레이션한 레퍼런스 이미지 목록 |
| `images/` · `screenshots/` · `wireframes/` | 레퍼런스 이미지 |
| `code-prep/` | 코드화 준비 자료 |
| `research/` | 리서치 raw 데이터 (gitignore — 9MB+ 스크래핑 원본) |

## 디자인 시스템 규칙

토큰 → Pencil 변수 매핑, 폰트, 아이콘, 컴포넌트 컨벤션은 `design-system` 스킬(`.claude/skills/design-system/`)을 참조.
