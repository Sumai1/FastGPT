import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudienceSwitcher } from '../../src/components/AudienceSwitcher';
import { CustomerServiceAudienceEnum } from '../../src/types';

describe('Tier 1 & 2 Component: 3-Tier Audience Mode Switcher (F-14 / F-15)', () => {
  it('T1-AUD-01: renders current audience option (public) with icon and trigger button', () => {
    const handleChange = vi.fn();
    render(
      <AudienceSwitcher audience={CustomerServiceAudienceEnum.public} onChange={handleChange} />
    );

    expect(screen.getByText('普通客户')).not.toBeNull();
  });

  it('T1-AUD-02: clicking trigger opens dropdown and shows all 3 tiers', () => {
    const handleChange = vi.fn();
    render(
      <AudienceSwitcher audience={CustomerServiceAudienceEnum.public} onChange={handleChange} />
    );

    const triggerBtn = screen.getByTitle(/当前身份：普通客户/);
    fireEvent.click(triggerBtn);

    expect(screen.getByText('切换咨询身份与权限')).not.toBeNull();
    expect(screen.getAllByText('普通客户').length).toBeGreaterThan(0);
    expect(screen.getByText('运营商 / 经销商')).not.toBeNull();
    expect(screen.getByText('内部售后技术')).not.toBeNull();
  });

  it('T1-AUD-03: selecting dealer audience triggers onChange and closes dropdown', () => {
    const handleChange = vi.fn();
    render(
      <AudienceSwitcher audience={CustomerServiceAudienceEnum.public} onChange={handleChange} />
    );

    fireEvent.click(screen.getByTitle(/当前身份：普通客户/));

    const dealerOption = screen.getByText('运营商 / 经销商').closest('.cs-audience-option-item');
    fireEvent.click(dealerOption!);

    expect(handleChange).toHaveBeenCalledWith(CustomerServiceAudienceEnum.dealer);
    expect(screen.queryByText('切换咨询身份与权限')).toBeNull();
  });

  it('T1-AUD-04: selecting internal engineering audience triggers onChange', () => {
    const handleChange = vi.fn();
    render(
      <AudienceSwitcher audience={CustomerServiceAudienceEnum.public} onChange={handleChange} />
    );

    fireEvent.click(screen.getByTitle(/当前身份：普通客户/));

    const internalOption = screen.getByText('内部售后技术').closest('.cs-audience-option-item');
    fireEvent.click(internalOption!);

    expect(handleChange).toHaveBeenCalledWith(CustomerServiceAudienceEnum.internal);
  });

  it('T1-AUD-05: clicking info (i) button toggles permission scope tooltip', () => {
    render(<AudienceSwitcher audience={CustomerServiceAudienceEnum.dealer} onChange={vi.fn()} />);

    const infoBtn = screen.getByLabelText('受众权限说明');
    fireEvent.click(infoBtn);

    expect(screen.getByText('【运营商 / 经销商】权限范围')).not.toBeNull();
    expect(screen.getByText(/已解锁商户日常巡检、补货、卡纸卡币清障/)).not.toBeNull();

    // Click again to close
    fireEvent.click(infoBtn);
    expect(screen.queryByText('【运营商 / 经销商】权限范围')).toBeNull();
  });

  it('T2-AUD-01: renders compact badge in compact mode', () => {
    render(
      <AudienceSwitcher
        audience={CustomerServiceAudienceEnum.internal}
        onChange={vi.fn()}
        compact={true}
      />
    );

    expect(screen.getByText('售后')).not.toBeNull();
  });

  it('T2-AUD-02: does not open dropdown when disabled is true', () => {
    render(
      <AudienceSwitcher
        audience={CustomerServiceAudienceEnum.public}
        onChange={vi.fn()}
        disabled={true}
      />
    );

    const triggerBtn = screen.getByTitle(/当前身份：普通客户/);
    fireEvent.click(triggerBtn);

    expect(screen.queryByText('切换咨询身份与权限')).toBeNull();
  });

  it('T2-AUD-03: closes dropdown and tooltip when clicking outside', () => {
    render(
      <div>
        <AudienceSwitcher audience={CustomerServiceAudienceEnum.public} onChange={vi.fn()} />
        <div data-testid="outside-area">Outside</div>
      </div>
    );

    fireEvent.click(screen.getByTitle(/当前身份：普通客户/));
    expect(screen.getByText('切换咨询身份与权限')).not.toBeNull();

    fireEvent.mouseDown(screen.getByTestId('outside-area'));
    expect(screen.queryByText('切换咨询身份与权限')).toBeNull();
  });
});
