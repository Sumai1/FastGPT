import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerServiceApp } from '../../src/components/CustomerServiceApp';
import * as apiModule from '../../src/services/api';
import { mockPublicBootstrap, mockChatResponseAnswered } from '../mocks/mockData';

describe('Tier 4 Real-World Scenario 3: Payment Dispute & Unresolved Feedback Loop', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchPublicBootstrap').mockResolvedValue(mockPublicBootstrap);
    vi.spyOn(apiModule, 'sendPublicChatMessageStream').mockResolvedValue(mockChatResponseAnswered);
    vi.spyOn(apiModule, 'submitPublicFeedback').mockResolvedValue(undefined);
  });

  it('E2E-SCENARIO-03: user reports payment deducted without dispensing -> submits unresolved feedback with reasons', async () => {
    render(<CustomerServiceApp access={{ type: 'public', publicId: 'DEMO_DEVICE_SUPPORT' }} />);

    await waitFor(() => {
      expect(screen.getAllByText('无人自助设备智能服务门户').length).toBeGreaterThan(0);
    });

    // 1. User clicks QuickApps scenario card for undelivered vending goods
    const undeliveredChip = screen
      .getByText(/售货机 扣款未掉货应急处理|扣款未掉货/)
      .closest('[role="button"]')!;
    fireEvent.click(undeliveredChip);

    // 2. AI responds
    await waitFor(() => {
      expect(screen.getByText('有帮助')).not.toBeNull();
      expect(screen.getByText('深度反馈')).not.toBeNull();
    });

    // 3. User clicks "深度反馈"
    const unresolvedBtn = screen.getByTitle('问题仍未解决？点击反馈');
    fireEvent.click(unresolvedBtn);

    // 4. FeedbackModal opens
    await waitFor(() => {
      expect(screen.getByText('问题未解决反馈')).not.toBeNull();
    });

    // 5. User selects reason "建议转人工处理" and enters detail
    const reasonPill = screen.getByText('建议转人工处理');
    fireEvent.click(reasonPill);

    const textarea = screen.getByPlaceholderText(/请补充具体说明/);
    fireEvent.change(textarea, { target: { value: '微信已扣款15元，但6号货道弹簧未旋转' } });

    // 6. User submits feedback
    const submitBtn = screen.getByText('提交反馈');
    fireEvent.click(submitBtn);

    // 7. Verify feedback API was called
    await waitFor(() => {
      expect(apiModule.submitPublicFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unresolved',
          content: '建议转人工处理；微信已扣款15元，但6号货道弹簧未旋转'
        })
      );
    });
  });
});
