import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerServiceApp } from '../../src/components/CustomerServiceApp';
import * as apiModule from '../../src/services/api';
import { mockPublicBootstrap, mockChatResponseAnswered } from '../mocks/mockData';

describe('Tier 4 Real-World Scenario 1: Photo Booth Paper Jam Full Troubleshooting Workflow', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchPublicBootstrap').mockResolvedValue(mockPublicBootstrap);
    vi.spyOn(apiModule, 'sendPublicChatMessageStream').mockResolvedValue(mockChatResponseAnswered);
    vi.spyOn(apiModule, 'submitPublicFeedback').mockResolvedValue(undefined);
  });

  it('E2E-SCENARIO-01: photo booth user diagnoses paper jam -> checks all 5 steps -> marks resolved successfully', async () => {
    render(<CustomerServiceApp access={{ type: 'public', publicId: 'DEMO_DEVICE_SUPPORT' }} />);

    // Step 1: Portal loads successfully
    await waitFor(() => {
      expect(screen.getAllByText('无人自助设备智能服务门户').length).toBeGreaterThan(0);
    });

    // Step 2: User opens device selector capsule and selects Photo Booth Model DT-2026
    const deviceCapsule = screen.getByRole('button', { name: /当前设备|选择设备型号/ });
    fireEvent.click(deviceCapsule);
    const modelSelect = screen.getByLabelText(/设备型号 \(Model\)/);
    fireEvent.change(modelSelect, { target: { value: 'PHOTO-DT2026' } });

    // Step 3: User clicks QuickApps scenario card for paper jam
    const jamChip = screen.getByText('拍照机 卡纸/切刀阻滞排查').closest('[role="button"]')!;
    fireEvent.click(jamChip);

    // Step 4: AI responds and renders 5-step interactive checkbox checklist
    await waitFor(() => {
      expect(screen.getByText('交互式步骤排查清单（可逐项勾选）')).not.toBeNull();
    });

    expect(screen.getByText('排查进度：0 / 5 步 (0%)')).not.toBeNull();

    // Step 5: User executes each step in order using role="checkbox"
    const stepCheckboxes = screen.getAllByRole('checkbox');
    expect(stepCheckboxes.length).toBe(5);

    fireEvent.click(stepCheckboxes[0]);
    expect(screen.getByText('排查进度：1 / 5 步 (20%)')).not.toBeNull();

    fireEvent.click(stepCheckboxes[1]);
    expect(screen.getByText('排查进度：2 / 5 步 (40%)')).not.toBeNull();

    fireEvent.click(stepCheckboxes[2]);
    expect(screen.getByText('排查进度：3 / 5 步 (60%)')).not.toBeNull();

    fireEvent.click(stepCheckboxes[3]);
    expect(screen.getByText('排查进度：4 / 5 步 (80%)')).not.toBeNull();

    fireEvent.click(stepCheckboxes[4]);
    expect(screen.getByText('排查进度：5 / 5 步 (100%)')).not.toBeNull();

    // Step 6: Confirmation box appears
    expect(screen.getByText('已完成全部排查步骤，设备是否已恢复正常？')).not.toBeNull();

    // Step 7: User confirms "已恢复正常"
    const resolvedBtn = screen.getByText('已恢复正常').closest('button');
    fireEvent.click(resolvedBtn!);

    // Step 8: Success feedback is displayed
    expect(screen.getByText(/感谢您的排查！故障已顺利解决/)).not.toBeNull();
  });
});
