import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerServiceApp } from '../../src/components/CustomerServiceApp';
import * as apiModule from '../../src/services/api';
import { mockPublicBootstrap, mockChatResponseAnswered } from '../mocks/mockData';

describe('Tier 3 Integration: Model Switch & Checklist Reset Interaction', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchPublicBootstrap').mockResolvedValue(mockPublicBootstrap);
    vi.spyOn(apiModule, 'sendPublicChatMessageStream').mockResolvedValue(mockChatResponseAnswered);
  });

  it('T3-SWT-01: active messages exist -> user switches model -> confirm dialog clears checklist & starts new session', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CustomerServiceApp access={{ type: 'public', publicId: 'DEMO_DEVICE_SUPPORT' }} />);

    // 1. Wait for bootstrap to load
    await waitFor(() => {
      expect(screen.getAllByText('无人自助设备智能服务门户').length).toBeGreaterThan(0);
    });

    // 2. Select initial model DT-2026
    const deviceCapsule = screen.getByRole('button', { name: /当前设备|选择设备型号/ });
    fireEvent.click(deviceCapsule);
    const modelSelect = screen.getByLabelText(/设备型号 \(Model\)/);
    fireEvent.change(modelSelect, { target: { value: 'PHOTO-DT2026' } });

    // 3. Send a message to get troubleshoot checklist
    const textarea = screen.getByLabelText('输入设备咨询问题');
    fireEvent.change(textarea, { target: { value: '拍照机卡纸' } });

    const sendBtn = screen.getByTitle('发送问题 (Enter)');
    fireEvent.click(sendBtn);

    // 4. Verify message list rendered the 5-step checklist
    await waitFor(() => {
      expect(screen.getByText('交互式步骤排查清单（可逐项勾选）')).not.toBeNull();
    });

    // Check step 1
    const stepCheckboxes = screen.getAllByRole('checkbox');
    fireEvent.click(stepCheckboxes[0]);
    expect(screen.getByText('排查进度：1 / 5 步 (20%)')).not.toBeNull();

    // 5. User switches model to Vending Machine VEND-SP60
    const modelSelect2 = screen.getByLabelText(/设备型号 \(Model\)/);
    fireEvent.change(modelSelect2, { target: { value: 'VEND-SP60' } });

    // Confirm dialog was triggered
    expect(confirmSpy).toHaveBeenCalledWith('切换产品型号将重置当前会话记录，是否继续？');

    // 6. Verify conversation and checklist are reset, returning to clean empty state
    await waitFor(() => {
      expect(screen.queryByText('交互式步骤排查清单（可逐项勾选）')).toBeNull();
      expect(screen.getByText('拍照机 卡纸/切刀阻滞排查')).not.toBeNull();
    });

    confirmSpy.mockRestore();
  });
});
