import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerServiceApp } from '../../src/components/CustomerServiceApp';
import * as apiModule from '../../src/services/api';
import { mockPublicBootstrap, mockChatResponseAnswered } from '../mocks/mockData';

describe('Tier 3 Integration: 3-Tier Audience Mode & Handoff Role Alignment', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchPublicBootstrap').mockResolvedValue(mockPublicBootstrap);
    vi.spyOn(apiModule, 'sendPublicChatMessageStream').mockResolvedValue(mockChatResponseAnswered);
  });

  it('T3-AUD-01: switching audience mode updates ticket summary identity in HumanHandoffModal', async () => {
    render(<CustomerServiceApp access={{ type: 'public', publicId: 'DEMO_DEVICE_SUPPORT' }} />);

    await waitFor(() => {
      expect(screen.getAllByText('无人自助设备智能服务门户').length).toBeGreaterThan(0);
    });

    // 1. Switch audience to dealer
    const audienceBtn = screen.getByTitle(/当前身份：普通客户/);
    fireEvent.click(audienceBtn);

    const dealerOption = screen.getByText('运营商 / 经销商').closest('.cs-audience-option-item');
    fireEvent.click(dealerOption!);

    // 2. Open human handoff modal via header
    const handoffHeaderBtn = screen.getByTitle('转接人工客服与工单摘要');
    fireEvent.click(handoffHeaderBtn);

    // 3. Verify ticket specifies dealer audience
    await waitFor(() => {
      expect(screen.getByText('转接人工客服支持')).not.toBeNull();
      expect(screen.getByText(/• 咨询身份：经销商\/运营 \(dealer\)/)).not.toBeNull();
    });

    // Close modal
    fireEvent.click(screen.getByText('关闭'));

    // 4. Switch audience to internal engineer
    const dealerAudienceBtn = screen.getByTitle(/当前身份：运营商 \/ 经销商/);
    fireEvent.click(dealerAudienceBtn);

    const internalOption = screen.getByText('内部售后技术').closest('.cs-audience-option-item');
    fireEvent.click(internalOption!);

    // 5. Open human handoff modal again and check internal role
    fireEvent.click(handoffHeaderBtn);

    await waitFor(() => {
      expect(screen.getByText(/• 咨询身份：内部售后技术 \(internal\)/)).not.toBeNull();
    });
  });
});
