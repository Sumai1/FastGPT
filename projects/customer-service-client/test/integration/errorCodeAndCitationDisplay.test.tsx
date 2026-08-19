import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerServiceApp } from '../../src/components/CustomerServiceApp';
import * as apiModule from '../../src/services/api';
import { mockPublicBootstrap, mockChatResponseAnswered } from '../mocks/mockData';

describe('Tier 3 Integration: Error Code Lookup & Citation Accordion Display', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchPublicBootstrap').mockResolvedValue(mockPublicBootstrap);
    vi.spyOn(apiModule, 'sendPublicChatMessageStream').mockResolvedValue(mockChatResponseAnswered);
  });

  it('T3-CIT-01: clicking error code E-01 dispatches inquiry -> response arrives -> renders expandable citations with scores', async () => {
    render(<CustomerServiceApp access={{ type: 'public', publicId: 'DEMO_DEVICE_SUPPORT' }} />);

    await waitFor(() => {
      expect(screen.getAllByText('无人自助设备智能服务门户').length).toBeGreaterThan(0);
    });

    // Click Error Code QuickApp chip
    const e01Chip = screen.getByText('错误代码秒查 (E-01 / V-101)').closest('[role="button"]')!;
    fireEvent.click(e01Chip);

    // Verify request was dispatched
    expect(apiModule.sendPublicChatMessageStream).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('E-01')
      })
    );

    // Wait for message and citation accordion
    await waitFor(() => {
      expect(screen.getByText(/知识库参考来源 \(4\)/)).not.toBeNull();
    });

    // Expand citations
    const citationBtn = screen.getByText(/知识库参考来源 \(4\)/);
    fireEvent.click(citationBtn);

    // Verify 4 structured citation types and match percentage scores
    expect(screen.getByText('【故障排查卡】DT-2026 打印机相纸卡阻标准处理 SOP')).not.toBeNull();
    expect(screen.getByText('匹配度 94%')).not.toBeNull();

    expect(screen.getByText('【操作手册】DT-2026 热升华耗材更换与切刀清洁指南')).not.toBeNull();
    expect(screen.getByText('匹配度 88%')).not.toBeNull();

    expect(screen.getByText('【产品主档】DT-2026A 旗舰桌面拍照机电气与结构规格')).not.toBeNull();
    expect(screen.getByText('匹配度 82%')).not.toBeNull();

    expect(screen.getByText('【服务政策】无人自助设备售后质保与备件响应时效')).not.toBeNull();
    expect(screen.getByText('匹配度 79%')).not.toBeNull();
  });
});
