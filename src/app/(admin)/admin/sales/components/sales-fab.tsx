'use client';

import {useState} from 'react';
import {Plus, Settings} from 'lucide-react';

import {ExportButton} from '@/components/ui/export-button';
import type {ExportConfig} from '@/lib/export';
import type {Sale} from '@/types/database';

/**
 * 매출 페이지 FAB(스피드 다이얼) — 등록/내보내기/설정 진입점.
 */
export function SalesFab({
  onOpenForm,
  onOpenSettings,
  getExportConfig,
}: {
  onOpenForm: () => void;
  onOpenSettings: () => void;
  getExportConfig: () => ExportConfig<Sale>;
}) {
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex flex-col items-end gap-2">
      {fabOpen && (
        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => { setFabOpen(false); onOpenForm(); }}
            className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-brand text-white text-sm font-medium shadow-lg"
          >
            <Plus className="w-4 h-4" />
            매출 등록
          </button>
          <ExportButton
            getExportConfig={getExportConfig}
            className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
          />
          <button
            type="button"
            onClick={() => { setFabOpen(false); onOpenSettings(); }}
            className="flex items-center gap-2 h-10 pr-4 pl-3 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
          >
            <Settings className="w-4 h-4" />
            설정
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setFabOpen(!fabOpen)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform duration-200 ${
          fabOpen ? 'bg-muted-foreground rotate-45' : 'bg-brand'
        }`}
        aria-label="액션 메뉴"
      >
        <Plus className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
