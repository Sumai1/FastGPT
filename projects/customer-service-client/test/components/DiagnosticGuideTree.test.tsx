import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagnosticGuideTree } from '../../src/components/DiagnosticGuideTree';

describe('Tier 1 & 2 Component: Diagnostic Guide Decision Tree (F-06 / F-07)', () => {
  it('T1-TREE-01: renders diagnostic tree title and default expanded capsules', () => {
    const handleSelect = vi.fn();
    render(<DiagnosticGuideTree onSelectGuide={handleSelect} />);

    expect(screen.getByText('设备场景化故障诊断向导')).not.toBeNull();
    expect(screen.getByText(/卡纸 \/ 切刀卡阻/)).not.toBeNull();
    expect(screen.getByText(/扣费未出货 \/ 掉货失败/)).not.toBeNull();
  });

  it('T1-TREE-02: tab switching filters Photo Booth zone scenarios', () => {
    const handleSelect = vi.fn();
    render(<DiagnosticGuideTree onSelectGuide={handleSelect} />);

    const photoTab = screen.getByText('拍照机专区');
    fireEvent.click(photoTab);

    // Photo booth capsules should be visible
    expect(screen.getByText(/卡纸 \/ 切刀卡阻/)).not.toBeNull();
    expect(screen.getByText(/黑屏 \/ 触摸无反应/)).not.toBeNull();
    expect(screen.getByText(/不打印 \/ 打印白片/)).not.toBeNull();
    expect(screen.getByText(/闪光灯故障 \/ 照片偏暗/)).not.toBeNull();
    expect(screen.getByText(/扫码后未启动拍照/)).not.toBeNull();

    // Vending machine capsules should be filtered out
    expect(screen.queryByText(/扣费未出货 \/ 掉货失败/)).toBeNull();
    expect(screen.queryByText(/制冷异常 \/ 温控偏高/)).toBeNull();
  });

  it('T1-TREE-03: tab switching filters Vending Machine zone scenarios', () => {
    const handleSelect = vi.fn();
    render(<DiagnosticGuideTree onSelectGuide={handleSelect} />);

    const vendingTab = screen.getByText('售货机专区');
    fireEvent.click(vendingTab);

    // Vending machine capsules should be visible
    expect(screen.getByText(/扣费未出货 \/ 掉货失败/)).not.toBeNull();
    expect(screen.getByText(/支付失败 \/ 扫码无响应/)).not.toBeNull();
    expect(screen.getByText(/货道卡货 \/ 电机堵转/)).not.toBeNull();
    expect(screen.getByText(/制冷异常 \/ 温控偏高/)).not.toBeNull();
    expect(screen.getByText(/投币不识别 \/ 找零异常/)).not.toBeNull();

    // Photo booth capsules should be filtered out
    expect(screen.queryByText(/卡纸 \/ 切刀卡阻/)).toBeNull();
  });

  it('T1-TREE-04: clicking a scenario capsule triggers onSelectGuide with prompt and category', () => {
    const handleSelect = vi.fn();
    render(<DiagnosticGuideTree onSelectGuide={handleSelect} />);

    const jamCapsule = screen.getByText(/卡纸 \/ 切刀卡阻/).closest('.cs-guide-capsule');
    expect(jamCapsule).not.toBeNull();

    fireEvent.click(jamCapsule!);
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.stringContaining('相纸卡在出片口或切刀处卡阻'),
      '拍照机专区'
    );
  });

  it('T1-TREE-05: toggles collapse and expand via header button', () => {
    const handleSelect = vi.fn();
    render(<DiagnosticGuideTree onSelectGuide={handleSelect} defaultExpanded={true} />);

    const toggleBtn = screen.getByTitle('收起诊断树');
    expect(screen.getByText(/全部高频场景/)).not.toBeNull();

    fireEvent.click(toggleBtn);
    expect(screen.queryByText(/全部高频场景/)).toBeNull();

    const expandBtn = screen.getByTitle('展开诊断树');
    fireEvent.click(expandBtn);
    expect(screen.getByText(/全部高频场景/)).not.toBeNull();
  });

  it('T1-TREE-06: opens interactive decision tree wizard modal and navigates branches', () => {
    const handleSelect = vi.fn();
    render(<DiagnosticGuideTree onSelectGuide={handleSelect} />);

    const wizardBtns = screen.getAllByTitle('打开多分支决策向导');
    fireEvent.click(wizardBtns[0]); // Open paper jam wizard

    expect(screen.getByText(/排障决策向导：卡纸 \/ 切刀卡阻/)).not.toBeNull();
    expect(screen.getByText('打印机当前状态指示灯为何种状态？')).not.toBeNull();

    // Click branch option "红灯快闪或常亮（内部机械卡阻）"
    const branchOpt = screen
      .getByText('红灯快闪或常亮（内部机械卡阻）')
      .closest('.cs-wizard-option-item');
    fireEvent.click(branchOpt!);

    // Should navigate to node-paper-2
    expect(screen.getByText('卡纸发生在哪个物理位置？')).not.toBeNull();
    expect(screen.getByText('在出纸口可见相纸边缘')).not.toBeNull();

    // Close wizard
    const closeBtn = screen.getByText('关闭');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/排障决策向导：卡纸 \/ 切刀卡阻/)).toBeNull();
  });

  it('T2-TREE-01: supports keyboard Enter / Space activation on capsules', () => {
    const handleSelect = vi.fn();
    render(<DiagnosticGuideTree onSelectGuide={handleSelect} />);

    const coolingCapsule = screen.getByText(/制冷异常 \/ 温控偏高/).closest('.cs-guide-capsule');
    expect(coolingCapsule).not.toBeNull();

    fireEvent.keyDown(coolingCapsule!, { key: 'Enter' });
    expect(handleSelect).toHaveBeenCalledWith(
      expect.stringContaining('冷藏柜箱体内温度偏高'),
      '售货机专区'
    );

    fireEvent.keyDown(coolingCapsule!, { key: ' ' });
    expect(handleSelect).toHaveBeenCalledTimes(2);
  });
});
