import { describe, it, expect } from 'vitest';
import { formatBytes, gbToBytes, bytesToGb } from '@/lib/format-bytes';

describe('format-bytes', () => {
  it('GiB 단위로 사람이 읽게 표시', () => {
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.0GB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5GB');
  });
  it('1GB 미만은 MB', () => {
    expect(formatBytes(500 * 1024 ** 2)).toBe('500MB');
    expect(formatBytes(0)).toBe('0MB');
  });
  it('GB↔bytes 변환', () => {
    expect(gbToBytes(3)).toBe(3 * 1024 ** 3);
    expect(bytesToGb(3 * 1024 ** 3)).toBe(3);
  });
});
