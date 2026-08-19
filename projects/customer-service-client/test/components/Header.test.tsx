import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../../src/components/Header';
import { CustomerServiceAudienceEnum } from '../../src/types';

describe('Tier 1 & 2 Component: Header, Brand Info & Status Indicator (F-01)', () => {
  it('T1-HDR-01: renders enterprise project name and online status badge', () => {
    render(
      <Header
        projectName="自助设备智能客服门户"
        audience={CustomerServiceAudienceEnum.public}
        onAudienceChange={vi.fn()}
        onNewConversation={vi.fn()}
        onOpenSessionDrawer={vi.fn()}
      />
    );

    expect(screen.getByText('自助设备智能客服门户')).not.toBeNull();
    expect(screen.getByText('在线')).not.toBeNull();
  });

  it('T1-HDR-02: renders session count badge and triggers history drawer open', () => {
    const handleOpenHistory = vi.fn();
    render(
      <Header
        projectName="测试客服"
        audience={CustomerServiceAudienceEnum.public}
        onAudienceChange={vi.fn()}
        onNewConversation={vi.fn()}
        onOpenSessionDrawer={handleOpenHistory}
        sessionCount={5}
      />
    );

    expect(screen.getByText('5')).not.toBeNull();

    const historyBtn = screen.getByTitle('查看历史会话记录');
    fireEvent.click(historyBtn);

    expect(handleOpenHistory).toHaveBeenCalledTimes(1);
  });

  it('T1-HDR-03: triggers new conversation callback', () => {
    const handleNew = vi.fn();
    render(
      <Header
        projectName="测试客服"
        audience={CustomerServiceAudienceEnum.public}
        onAudienceChange={vi.fn()}
        onNewConversation={handleNew}
        onOpenSessionDrawer={vi.fn()}
      />
    );

    const newBtn = screen.getByTitle('开启新会话');
    fireEvent.click(newBtn);

    expect(handleNew).toHaveBeenCalledTimes(1);
  });

  it('T1-HDR-04: triggers model selector sidebar toggle button', () => {
    const handleToggle = vi.fn();
    render(
      <Header
        projectName="测试客服"
        audience={CustomerServiceAudienceEnum.public}
        onAudienceChange={vi.fn()}
        onNewConversation={vi.fn()}
        onOpenSessionDrawer={vi.fn()}
        onToggleProductSelector={handleToggle}
        isSidebarOpen={false}
      />
    );

    const modelBtn = screen.getByTitle('切换产品型号');
    fireEvent.click(modelBtn);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('T1-HDR-05: renders widget close button when in widget mode', () => {
    const handleClose = vi.fn();
    render(
      <Header
        projectName="测试客服"
        audience={CustomerServiceAudienceEnum.public}
        onAudienceChange={vi.fn()}
        onNewConversation={vi.fn()}
        onOpenSessionDrawer={vi.fn()}
        isWidget={true}
        onCloseWidget={handleClose}
      />
    );

    const closeBtn = screen.getByTitle('关闭浮窗');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('T2-HDR-01: renders direct phone call link when humanContact is provided and handoff is omitted', () => {
    render(
      <Header
        projectName="测试客服"
        audience={CustomerServiceAudienceEnum.public}
        onAudienceChange={vi.fn()}
        onNewConversation={vi.fn()}
        onOpenSessionDrawer={vi.fn()}
        humanContact={{ name: '客服专线', phone: '400-123-4567' }}
      />
    );

    const phoneLink = screen.getByTitle(/拨打客服电话: 400-123-4567/);
    expect(phoneLink.getAttribute('href')).toBe('tel:400-123-4567');
  });

  it('T2-HDR-02: renders human handoff button when onOpenHumanHandoff is provided', () => {
    const handleHandoff = vi.fn();
    render(
      <Header
        projectName="测试客服"
        audience={CustomerServiceAudienceEnum.public}
        onAudienceChange={vi.fn()}
        onNewConversation={vi.fn()}
        onOpenSessionDrawer={vi.fn()}
        onOpenHumanHandoff={handleHandoff}
      />
    );

    const handoffBtn = screen.getByTitle('转接人工客服与工单摘要');
    fireEvent.click(handoffBtn);

    expect(handleHandoff).toHaveBeenCalledTimes(1);
  });
});
