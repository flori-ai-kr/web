import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/admin-guard', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ apiFetch: vi.fn() }));

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { apiFetch } from '@/lib/api/client';
import {
  listPrompts,
  getPrompt,
  createPrompt,
  updatePrompt,
  activatePrompt,
  deletePrompt,
  previewPrompt,
} from '../admin-prompts';

const mockApiFetch = vi.mocked(apiFetch);
const mockRequireAdmin = vi.mocked(requireAdmin);
const mockRevalidate = vi.mocked(revalidatePath);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockRequireAdmin.mockResolvedValue(undefined as never);
});

describe('listPrompts', () => {
  it('채널로 목록 조회', async () => {
    mockApiFetch.mockResolvedValue([]);
    await listPrompts('blog');
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/prompts?channel=blog');
  });
});

describe('getPrompt', () => {
  it('id로 상세 조회', async () => {
    mockApiFetch.mockResolvedValue({ id: 1 });
    await getPrompt(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/prompts/1');
  });

  it('잘못된 id는 거부', async () => {
    await expect(getPrompt(0)).rejects.toThrow();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('createPrompt', () => {
  it('POST 후 revalidate', async () => {
    mockApiFetch.mockResolvedValue({ id: 1 });
    await createPrompt({ version: 'v1', systemMd: '시스템' });
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/prompts', expect.objectContaining({ method: 'POST' }));
    expect(mockRevalidate).toHaveBeenCalledWith('/console/prompts');
  });

  it('화이트리스트 밖 모델은 거부', async () => {
    await expect(createPrompt({ version: 'v1', systemMd: 'x', model: 'gpt-4o' })).rejects.toThrow();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('updatePrompt', () => {
  it('PATCH 후 revalidate', async () => {
    mockApiFetch.mockResolvedValue({ id: 1 });
    await updatePrompt(1, { notes: '메모' });
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/prompts/1', expect.objectContaining({ method: 'PATCH' }));
    expect(mockRevalidate).toHaveBeenCalledWith('/console/prompts');
  });
});

describe('activatePrompt', () => {
  it('activate POST 후 revalidate', async () => {
    mockApiFetch.mockResolvedValue({ id: 1, isActive: true });
    await activatePrompt(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/prompts/1/activate', { method: 'POST' });
    expect(mockRevalidate).toHaveBeenCalledWith('/console/prompts');
  });
});

describe('deletePrompt', () => {
  it('DELETE 후 revalidate', async () => {
    mockApiFetch.mockResolvedValue(undefined);
    await deletePrompt(1);
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/prompts/1', { method: 'DELETE' });
    expect(mockRevalidate).toHaveBeenCalledWith('/console/prompts');
  });
});

describe('previewPrompt', () => {
  it('preview POST — 저장 없음(revalidate 안 함)', async () => {
    mockApiFetch.mockResolvedValue({
      draft: { title: 't', sections: [], faq: [], hashtags: [] },
      model: 'claude-sonnet-4-6',
    });
    await previewPrompt({ promptDraft: { systemMd: 's' }, sampleInput: { keyword: '장미' } });
    expect(mockApiFetch).toHaveBeenCalledWith('/admin/prompts/preview', expect.objectContaining({ method: 'POST' }));
    expect(mockRevalidate).not.toHaveBeenCalled();
  });
});
