import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerServiceApp } from '../../src/components/CustomerServiceApp';
import * as apiModule from '../../src/services/api';
import { mockPublicBootstrap, mockChatResponseWithDanger } from '../mocks/mockData';

describe('Tier 3 Integration: High-Danger Safety Interlock & Auto-Ticket Handoff', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchPublicBootstrap').mockResolvedValue(mockPublicBootstrap);
    vi.spyOn(apiModule, 'sendPublicChatMessageStream').mockResolvedValue(
      mockChatResponseWithDanger
    );
  });

  it('T3-SAF-01: high-risk keyword detected -> SafetyAlertCard blocks -> transfers to HumanHandoffModal with danger details', async () => {
    render(<CustomerServiceApp access={{ type: 'public', publicId: 'DEMO_DEVICE_SUPPORT' }} />);

    await waitFor(() => {
      expect(screen.getAllByText('无人自助设备智能服务门户').length).toBeGreaterThan(0);
    });

    // Send dangerous question
    const textarea = screen.getByLabelText('输入设备咨询问题');
    fireEvent.change(textarea, { target: { value: '如何带电拆开开关电源测量220V强电？' } });

    const sendBtn = screen.getByTitle('发送问题 (Enter)');
    fireEvent.click(sendBtn);

    // Wait for response and SafetyAlertCard
    await waitFor(() => {
      expect(screen.getByText('阻断级高危电气安全警示')).not.toBeNull();
    });

    expect(screen.getByText(/检测到高压电与带电拆机危险/)).not.toBeNull();

    // Click "一键转接人工售后" in SafetyAlertCard
    const handoffBtn = screen.getByText('一键转接人工售后').closest('button');
    fireEvent.click(handoffBtn!);

    // Verify HumanHandoffModal opened with danger fault summary
    await waitFor(() => {
      expect(screen.getByText('转接人工客服支持')).not.toBeNull();
      expect(screen.getByText(/• 故障现象：触发高压电\/带电拆机高危安全警示/)).not.toBeNull();
    });

    // Click copy ticket
    const copyBtn = screen.getByText('一键复制摘要');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('触发高压电/带电拆机高危安全警示')
    );
  });
});
