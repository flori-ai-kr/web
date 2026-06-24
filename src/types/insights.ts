// ─── 스크랩/메모 ──────────────────────────────────────────
// 팔로우(인스타)·트렌드 제거로 target_type 은 grant 만 남는다.
export type ScrapTargetType = 'grant';

export interface InsightScrap {
  id: string;
  user_id: string;
  target_type: ScrapTargetType;
  target_id: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapInfo {
  id: string;
  memo: string | null;
}

export type ScrapMap = Record<string, ScrapInfo>;
