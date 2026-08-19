import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HumanHandoffModal } from '../../src/components/HumanHandoffModal';
import { CustomerServiceAudienceEnum } from '../../src/types';
import type { HumanHandoffData } from '../../src/types';

describe('Tier 1 & 2 Component: Human Handoff Ticket Aggregation Modal (F-14 / F-15)', () => {
  const sampleContact = {
    name: '官方售后客服中心',
    phone: '400-888-2026',
    url: 'https://support.example.com/live',
    workTime: '周一至周日 08:30 - 22:30'
  };

  const sampleHandoff: HumanHandoffData = {
    projectName: '无人自助设备智能客服',
    productModel: 'PHOTO-DT2026',
    hardwareVersion: 'HW-V2.0',
    softwareVersion: 'SW-V3.5.0',
    audience: CustomerServiceAudienceEnum.dealer,
    faultSummary: '拍照机相纸卡阻，切刀卡死在滑轨中间',
    troubleshootSteps: [
      { title: '切断设备总电源并拔掉插头', completed: true },
      { title: '打开打印机前仓门取出卡阻相纸', completed: true },
      { title: '手动归位切刀', completed: false }
    ],
    timestamp: 1771400000000,
    sessionId: 'session-handoff-888',
    humanContact: sampleContact
  };

  it('T1-HND-01: does not render anything when isOpen is false', () => {
    const { container } = render(
      <HumanHandoffModal isOpen={false} onClose={vi.fn()} handoffData={sampleHandoff} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('T1-HND-02: renders modal title, phone dial link and online platform button', () => {
    render(<HumanHandoffModal isOpen={true} onClose={vi.fn()} handoffData={sampleHandoff} />);

    expect(screen.getByText('转接人工客服支持')).not.toBeNull();
    expect(screen.getByText('立即拨打：400-888-2026')).not.toBeNull();
    expect(screen.getByText('进入在线客服平台')).not.toBeNull();
    expect(screen.getByText('服务时间：周一至周日 08:30 - 22:30')).not.toBeNull();
  });

  it('T1-HND-03: aggregates structured handoff ticket preview with model, versions and checked steps', () => {
    render(<HumanHandoffModal isOpen={true} onClose={vi.fn()} handoffData={sampleHandoff} />);

    const preview = screen.getByText(/【智能客服售后转接工单】/);
    expect(preview).not.toBeNull();
    expect(preview.textContent).toContain('• 所属客服：无人自助设备智能客服');
    expect(preview.textContent).toContain('• 设备型号：PHOTO-DT2026');
    expect(preview.textContent).toContain('• 软硬件版本：HW HW-V2.0 / SW SW-V3.5.0');
    expect(preview.textContent).toContain('• 咨询身份：经销商/运营 (dealer)');
    expect(preview.textContent).toContain('• 故障现象：拍照机相纸卡阻，切刀卡死在滑轨中间');
    expect(preview.textContent).toContain('[✓已排查] 1. 切断设备总电源并拔掉插头');
    expect(preview.textContent).toContain('[✓已排查] 2. 打开打印机前仓门取出卡阻相纸');
    expect(preview.textContent).toContain('[✗未完成/未解决] 3. 手动归位切刀');
    expect(preview.textContent).toContain('• 会话编号：session-handoff-888');
  });

  it('T1-HND-04: clicking copy ticket button copies full formatted ticket to clipboard with feedback', async () => {
    render(<HumanHandoffModal isOpen={true} onClose={vi.fn()} handoffData={sampleHandoff} />);

    const copyBtn = screen.getByText('一键复制摘要');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('【智能客服售后转接工单】')
    );

    await waitFor(() => {
      expect(screen.getByText('已复制工单')).not.toBeNull();
    });
  });

  it('T1-HND-05: clicking copy in footer triggers clipboard copy', async () => {
    render(<HumanHandoffModal isOpen={true} onClose={vi.fn()} handoffData={sampleHandoff} />);

    const copyAndCloseBtn = screen.getByText('复制工单并关闭');
    fireEvent.click(copyAndCloseBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('T2-HND-01: handles missing optional fields gracefully without crashing', () => {
    const minimalHandoff: HumanHandoffData = {
      timestamp: Date.now()
    };

    render(<HumanHandoffModal isOpen={true} onClose={vi.fn()} handoffData={minimalHandoff} />);

    const preview = screen.getByText(/【智能客服售后转接工单】/);
    expect(preview.textContent).toContain('通用机型 / 未选择特定型号');
    expect(preview.textContent).toContain('用户请求人工客服介入协助');
  });
});
