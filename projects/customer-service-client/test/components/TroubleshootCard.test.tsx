import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TroubleshootCard } from '../../src/components/TroubleshootCard';
import type { TroubleshootStep } from '../../src/types';

describe('Tier 1 & 2 Component: Interactive Checkbox Troubleshoot Card (F-09 / F-10)', () => {
  const sampleSteps: TroubleshootStep[] = [
    {
      id: 'step-1',
      index: 1,
      title: '切断设备后方总电源',
      detail: '请从墙壁插座彻底拔下电源线，等待 30 秒使电容放电。',
      isDanger: true,
      completed: false
    },
    {
      id: 'step-2',
      index: 2,
      title: '打开前仓门取出卡阻相纸',
      detail: '平稳反向抽拉相纸，切忌用力过猛扯断纸张。',
      completed: false
    },
    {
      id: 'step-3',
      index: 3,
      title: '通电重启测试',
      completed: false
    }
  ];

  it('T1-TRB-01: renders all steps with danger badge on high-risk step', () => {
    render(<TroubleshootCard steps={sampleSteps} />);

    expect(screen.getByText('交互式故障排查步骤清单')).not.toBeNull();
    expect(screen.getByText('排查进度：0 / 3 步 (0%)')).not.toBeNull();
    expect(screen.getByText('切断设备后方总电源')).not.toBeNull();
    expect(screen.getByText('高危断电操作')).not.toBeNull();
  });

  it('T1-TRB-02: toggling steps updates completion count and progress percentage', () => {
    const handleToggle = vi.fn();
    render(<TroubleshootCard steps={sampleSteps} onStepToggle={handleToggle} />);

    const firstStep = screen.getByText('切断设备后方总电源').closest('.cs-troubleshoot-step-item');
    fireEvent.click(firstStep!);

    expect(handleToggle).toHaveBeenCalledWith('step-1', true);
    expect(screen.getByText('排查进度：1 / 3 步 (33%)')).not.toBeNull();

    // Toggle again to uncheck
    fireEvent.click(firstStep!);
    expect(handleToggle).toHaveBeenCalledWith('step-1', false);
    expect(screen.getByText('排查进度：0 / 3 步 (0%)')).not.toBeNull();
  });

  it('T1-TRB-03: expands and collapses step operational details', () => {
    render(<TroubleshootCard steps={sampleSteps} />);

    expect(screen.queryByText(/请从墙壁插座彻底拔下电源线/)).toBeNull();

    const expandBtn = screen.getAllByText('展开操作要领')[0];
    fireEvent.click(expandBtn);

    expect(screen.getByText(/请从墙壁插座彻底拔下电源线/)).not.toBeNull();

    const collapseBtn = screen.getByText('收起详情');
    fireEvent.click(collapseBtn);

    expect(screen.queryByText(/请从墙壁插座彻底拔下电源线/)).toBeNull();
  });

  it('T1-TRB-04: clicking reset resets all checked steps to unchecked', () => {
    render(<TroubleshootCard steps={sampleSteps} />);

    const stepItems = screen.getAllByRole('checkbox');
    fireEvent.click(stepItems[0]);
    fireEvent.click(stepItems[1]);

    expect(screen.getByText('排查进度：2 / 3 步 (67%)')).not.toBeNull();

    const resetBtn = screen.getByTitle('重置排查勾选');
    fireEvent.click(resetBtn);

    expect(screen.getByText('排查进度：0 / 3 步 (0%)')).not.toBeNull();
  });

  it('T1-TRB-05: completing all steps reveals recovery confirmation box', () => {
    const handleResolved = vi.fn();
    const handleHandoff = vi.fn();

    render(
      <TroubleshootCard
        steps={sampleSteps}
        onResolvedFeedback={handleResolved}
        onRequestHumanHandoff={handleHandoff}
      />
    );

    const stepItems = screen.getAllByRole('checkbox');
    fireEvent.click(stepItems[0]);
    fireEvent.click(stepItems[1]);
    fireEvent.click(stepItems[2]);

    expect(screen.getByText('排查进度：3 / 3 步 (100%)')).not.toBeNull();
    expect(screen.getByText('已完成全部排查步骤，设备是否已恢复正常？')).not.toBeNull();

    // Click "已恢复正常"
    const solvedBtn = screen.getByText('已恢复正常').closest('button');
    fireEvent.click(solvedBtn!);

    expect(handleResolved).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/感谢您的排查！故障已顺利解决/)).not.toBeNull();
  });

  it('T2-TRB-01: clicking unresolved handoff button triggers onRequestHumanHandoff', () => {
    const handleHandoff = vi.fn();
    render(<TroubleshootCard steps={sampleSteps} onRequestHumanHandoff={handleHandoff} />);

    const stepItems = screen.getAllByRole('checkbox');
    stepItems.forEach((item) => fireEvent.click(item));

    const unresolvedBtn = screen.getByText('仍未恢复，转人工客服').closest('button');
    fireEvent.click(unresolvedBtn!);

    expect(handleHandoff).toHaveBeenCalledTimes(1);
  });

  it('T2-TRB-02: bottom shortcut handoff link triggers onRequestHumanHandoff directly', () => {
    const handleHandoff = vi.fn();
    render(<TroubleshootCard steps={sampleSteps} onRequestHumanHandoff={handleHandoff} />);

    const handoffLink = screen.getByText('一键转人工工单').closest('button');
    fireEvent.click(handoffLink!);

    expect(handleHandoff).toHaveBeenCalledTimes(1);
  });
});
