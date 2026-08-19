import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionDrawer } from '../../src/components/SessionDrawer';
import type { SessionSummary } from '../../src/types';

describe('Tier 1 & 2 Component: Session History Drawer & Management (F-05 / F-21)', () => {
  const sampleSessions: SessionSummary[] = [
    {
      id: 'sess-1',
      title: '拍照机卡纸排查',
      preview: '已完成步骤1、2...',
      messageCount: 4,
      createdAt: Date.now() - 3600 * 1000,
      updatedAt: Date.now() - 3600 * 1000,
      selection: {
        seriesCode: 'PHOTO_DESKTOP',
        modelCode: 'PHOTO-DT2026',
        hardwareVersionCode: '',
        softwareVersionCode: ''
      }
    },
    {
      id: 'sess-2',
      title: '售货机不制冷排查',
      preview: '检测到高压危险...',
      messageCount: 2,
      createdAt: Date.now() - 20000 * 1000,
      updatedAt: Date.now() - 20000 * 1000,
      selection: {
        seriesCode: 'VEND_BEVERAGE',
        modelCode: 'VEND-BV80',
        hardwareVersionCode: '',
        softwareVersionCode: ''
      }
    }
  ];

  it('T1-DRW-01: does not render anything when isOpen is false', () => {
    const { container } = render(
      <SessionDrawer
        isOpen={false}
        onClose={vi.fn()}
        sessions={sampleSessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onClearAllSessions={vi.fn()}
        onExportMarkdown={vi.fn()}
        onCopyAllText={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('T1-DRW-02: renders session list items with model badge and preview text', () => {
    render(
      <SessionDrawer
        isOpen={true}
        onClose={vi.fn()}
        sessions={sampleSessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onClearAllSessions={vi.fn()}
        onExportMarkdown={vi.fn()}
        onCopyAllText={vi.fn()}
      />
    );

    expect(screen.getByText('历史会话与回放')).not.toBeNull();
    expect(screen.getByText('拍照机卡纸排查')).not.toBeNull();
    expect(screen.getByText('型号: PHOTO-DT2026')).not.toBeNull();
    expect(screen.getByText('售货机不制冷排查')).not.toBeNull();
    expect(screen.getByText('型号: VEND-BV80')).not.toBeNull();
  });

  it('T1-DRW-03: selecting a session triggers onSelectSession and closes drawer', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <SessionDrawer
        isOpen={true}
        onClose={handleClose}
        sessions={sampleSessions}
        currentSessionId="sess-1"
        onSelectSession={handleSelect}
        onNewSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onClearAllSessions={vi.fn()}
        onExportMarkdown={vi.fn()}
        onCopyAllText={vi.fn()}
      />
    );

    const session2Item = screen.getByText('售货机不制冷排查').closest('.cs-drawer-session-item');
    fireEvent.click(session2Item!);

    expect(handleSelect).toHaveBeenCalledWith('sess-2');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('T1-DRW-04: deleting a single session confirms and triggers onDeleteSession', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const handleDelete = vi.fn();

    render(
      <SessionDrawer
        isOpen={true}
        onClose={vi.fn()}
        sessions={sampleSessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={handleDelete}
        onClearAllSessions={vi.fn()}
        onExportMarkdown={vi.fn()}
        onCopyAllText={vi.fn()}
      />
    );

    const deleteBtns = screen.getAllByTitle('删除会话');
    fireEvent.click(deleteBtns[0]);

    expect(confirmSpy).toHaveBeenCalledWith('确定删除该会话记录吗？');
    expect(handleDelete).toHaveBeenCalledWith('sess-1');

    confirmSpy.mockRestore();
  });

  it('T1-DRW-05: clearing all sessions confirms and triggers onClearAllSessions', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const handleClearAll = vi.fn();

    render(
      <SessionDrawer
        isOpen={true}
        onClose={vi.fn()}
        sessions={sampleSessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onClearAllSessions={handleClearAll}
        onExportMarkdown={vi.fn()}
        onCopyAllText={vi.fn()}
      />
    );

    const clearBtn = screen.getByTitle('清空所有记录');
    fireEvent.click(clearBtn);

    expect(confirmSpy).toHaveBeenCalledWith('确定要清空全部历史会话吗？此操作无法撤销。');
    expect(handleClearAll).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });

  it('T1-DRW-06: triggers export markdown and copy all text buttons', () => {
    const handleExport = vi.fn();
    const handleCopy = vi.fn();

    render(
      <SessionDrawer
        isOpen={true}
        onClose={vi.fn()}
        sessions={sampleSessions}
        currentSessionId="sess-1"
        onSelectSession={vi.fn()}
        onNewSession={vi.fn()}
        onDeleteSession={vi.fn()}
        onClearAllSessions={vi.fn()}
        onExportMarkdown={handleExport}
        onCopyAllText={handleCopy}
      />
    );

    fireEvent.click(screen.getByTitle('导出当前会话为 Markdown 文件'));
    expect(handleExport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('复制当前会话全量文本'));
    expect(handleCopy).toHaveBeenCalledTimes(1);
  });

  it('T2-DRW-01: renders empty state when sessions array is empty', () => {
    const handleNew = vi.fn();
    const handleClose = vi.fn();

    render(
      <SessionDrawer
        isOpen={true}
        onClose={handleClose}
        sessions={[]}
        currentSessionId=""
        onSelectSession={vi.fn()}
        onNewSession={handleNew}
        onDeleteSession={vi.fn()}
        onClearAllSessions={vi.fn()}
        onExportMarkdown={vi.fn()}
        onCopyAllText={vi.fn()}
      />
    );

    expect(screen.getByText('暂无历史会话')).not.toBeNull();

    const startBtn = screen.getByText('立即开始新咨询');
    fireEvent.click(startBtn);

    expect(handleNew).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
