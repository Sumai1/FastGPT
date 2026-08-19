import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SafetyAlertCard } from '../../src/components/SafetyAlertCard';

describe('Tier 1 & 2 Unit: Safety Interlocks & Blocking Alert Card', () => {
  it('T1-SAF-01: renders blocking safety card with pulsing hazard dot and default prohibited list', () => {
    const handleAck = vi.fn();
    const handleContact = vi.fn();

    const { container } = render(
      <SafetyAlertCard
        level="danger"
        title="阻断级高危电气安全警示"
        message="检测到当前排查涉及 220V 交流高压电源或强电总成。"
        onAcknowledge={handleAck}
        onContactSupport={handleContact}
        phone="400-888-2026"
      />
    );

    expect(screen.getByText('阻断级高危电气安全警示')).not.toBeNull();
    expect(screen.getByText(/220V 交流高压电源/)).not.toBeNull();
    expect(container.querySelector('.cs-safety-hazard-pulsing-dot')).not.toBeNull();

    // Check prohibited actions
    expect(screen.getByText(/严禁在未完全切断市电总电源/)).not.toBeNull();
    expect(screen.getByText(/严禁触碰高压开关电源/)).not.toBeNull();
    expect(screen.getByText(/非专业持证售后维修人员切勿私自/)).not.toBeNull();
  });

  it('T1-SAF-02: renders phone call link and direct support action button', () => {
    const handleContact = vi.fn();
    render(
      <SafetyAlertCard message="高压危险" phone="400-888-2026" onContactSupport={handleContact} />
    );

    const phoneLink = screen.getByText(/拨打售后电话 \(400-888-2026\)/).closest('a');
    expect(phoneLink?.getAttribute('href')).toBe('tel:400-888-2026');

    const supportBtn = screen.getByText('一键转接人工售后');
    fireEvent.click(supportBtn);
    expect(handleContact).toHaveBeenCalledTimes(1);
  });

  it('T1-SAF-03: user acknowledgment changes button state to confirmed', () => {
    const handleAck = vi.fn();
    render(<SafetyAlertCard message="请确认断电安全" onAcknowledge={handleAck} />);

    const ackBtn = screen.getByText('我已切断电源并已知悉安全风险');
    fireEvent.click(ackBtn);

    expect(handleAck).toHaveBeenCalledTimes(1);
    expect(screen.getByText('已确认安全风险须知')).not.toBeNull();
  });

  it('T1-SAF-04: supports custom prohibited actions list', () => {
    const customActions = ['严禁使用明火检修 R290 制冷系统', '严禁在无防爆抽风环境下焊接铜管'];

    render(
      <SafetyAlertCard
        title="制冷剂安全警示"
        message="制冷系统泄漏风险"
        prohibitedActions={customActions}
      />
    );

    expect(screen.getByText('严禁使用明火检修 R290 制冷系统')).not.toBeNull();
    expect(screen.getByText('严禁在无防爆抽风环境下焊接铜管')).not.toBeNull();
  });

  it('T1-SAF-05: supports different severity levels (critical, danger, warning)', () => {
    const { container, rerender } = render(<SafetyAlertCard level="critical" message="严重故障" />);
    expect(container.querySelector('.cs-safety-level-critical')).not.toBeNull();

    rerender(<SafetyAlertCard level="warning" message="一般警告" />);
    expect(container.querySelector('.cs-safety-level-warning')).not.toBeNull();
  });

  it('T2-SAF-01: handles empty prohibited actions gracefully', () => {
    const { container } = render(
      <SafetyAlertCard message="仅文本安全提示" prohibitedActions={[]} />
    );

    expect(container.querySelector('.cs-safety-prohibited-box')).toBeNull();
    expect(screen.getByText('仅文本安全提示')).not.toBeNull();
  });

  it('T2-SAF-02: does not render phone button if phone is omitted', () => {
    render(<SafetyAlertCard message="无电话安全提示" />);
    expect(screen.queryByText(/拨打售后电话/)).toBeNull();
  });
});
