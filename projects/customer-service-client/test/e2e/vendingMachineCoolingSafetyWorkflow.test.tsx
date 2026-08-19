import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerServiceApp } from '../../src/components/CustomerServiceApp';
import * as apiModule from '../../src/services/api';
import { mockPublicBootstrap, mockChatResponseWithDanger } from '../mocks/mockData';

describe('Tier 4 Real-World Scenario 2: Vending Machine Cooling Failure & Safety Interlock Workflow', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchPublicBootstrap').mockResolvedValue(mockPublicBootstrap);
    vi.spyOn(apiModule, 'sendPublicChatMessageStream').mockResolvedValue(
      mockChatResponseWithDanger
    );
  });

  it('E2E-SCENARIO-02: vending machine cooling failure triggers electrical/refrigerant interlock -> ack -> auto-ticket handoff', async () => {
    render(<CustomerServiceApp access={{ type: 'public', publicId: 'DEMO_DEVICE_SUPPORT' }} />);

    await waitFor(() => {
      expect(screen.getAllByText('无人自助设备智能服务门户').length).toBeGreaterThan(0);
    });

    // 1. Select Vending Machine Model BV-80
    const deviceCapsule = screen.getByRole('button', { name: /当前设备|选择设备型号/ });
    fireEvent.click(deviceCapsule);
    const modelSelect = screen.getByLabelText(/设备型号 \(Model\)/);
    fireEvent.change(modelSelect, { target: { value: 'VEND-BV80' } });

    // 2. Select Hardware Version HW-R290
    await waitFor(() => {
      expect(screen.getByLabelText(/硬件版本/)).not.toBeNull();
    });
    const hwSelect = screen.getByLabelText(/硬件版本/);
    fireEvent.change(hwSelect, { target: { value: 'HW-R290' } });

    // 3. Inquire about compressor overhaul
    const input = screen.getByLabelText('输入设备咨询问题');
    fireEvent.change(input, {
      target: { value: '售货机压缩机不启动，能否带电拆开强电总成检修？' }
    });

    const sendBtn = screen.getByTitle('发送问题 (Enter)');
    fireEvent.click(sendBtn);

    // 4. Blocking Safety Alert Card appears
    await waitFor(() => {
      expect(screen.getByText('阻断级高危电气安全警示')).not.toBeNull();
    });

    // 5. User acknowledges safety risk
    const ackBtn = screen.getByText('我已切断电源并已知悉安全风险');
    fireEvent.click(ackBtn);
    expect(screen.getByText('已确认安全风险须知')).not.toBeNull();

    // 6. User clicks transfer to human support
    const handoffBtn = screen.getByText('一键转接人工售后');
    fireEvent.click(handoffBtn);

    // 7. Structured ticket is generated with model and version
    await waitFor(() => {
      expect(screen.getByText('转接人工客服支持')).not.toBeNull();
      const preview = screen.getByText(/【智能客服售后转接工单】/);
      expect(preview.textContent).toContain('设备型号：VEND-BV80');
      expect(preview.textContent).toContain('软硬件版本：HW HW-R290 / SW 通用');
    });

    // Human support phone is visible in contact section
    expect(screen.getAllByText(/400-888-2026/).length).toBeGreaterThan(0);

    // 8. One-click copy
    const copyBtn = screen.getByText('一键复制摘要');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('【智能客服售后转接工单】')
    );
  });
});
