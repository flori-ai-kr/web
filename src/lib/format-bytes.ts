const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

/** 바이트 → 사람이 읽는 문자열. 1GiB 이상은 "x.xGB", 미만은 "xMB"(정수). */
export function formatBytes(bytes: number): string {
  if (bytes >= GIB) return `${(bytes / GIB).toFixed(1)}GB`;
  return `${Math.round(bytes / MIB)}MB`;
}

export function gbToBytes(gb: number): number {
  return Math.round(gb * GIB);
}

export function bytesToGb(bytes: number): number {
  return bytes / GIB;
}
