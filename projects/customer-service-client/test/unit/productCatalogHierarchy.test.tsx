import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductSelector } from '../../src/components/ProductSelector';
import { mockPublicBootstrap } from '../mocks/mockData';
import type { ProductSelection } from '../../src/types';

describe('Tier 1 & 2 Unit: 4-Tier Hierarchy Cascade & Product Selection', () => {
  const initialSelection: ProductSelection = {
    seriesCode: '',
    modelCode: '',
    hardwareVersionCode: '',
    softwareVersionCode: ''
  };

  it('T1-PROD-01: renders all product series in dropdown options', () => {
    const handleSelect = vi.fn();
    render(
      <ProductSelector
        catalog={mockPublicBootstrap.catalog}
        selection={initialSelection}
        defaultExpanded={true}
        onSelectProduct={handleSelect}
      />
    );

    const seriesSelect = screen.getByLabelText(/产品系列/);
    expect(seriesSelect).not.toBeNull();

    // Check series options
    expect(screen.getByText(/桌面立式系列/)).not.toBeNull();
    expect(screen.getByText(/沉浸亭式系列/)).not.toBeNull();
    expect(screen.getByText(/弹簧履带零售系列/)).not.toBeNull();
    expect(screen.getByText(/智能控温饮料系列/)).not.toBeNull();
  });

  it('T1-PROD-02: selecting a series cascades and filters available models', () => {
    const handleSelect = vi.fn();
    const photoSelection: ProductSelection = {
      ...initialSelection,
      seriesCode: 'PHOTO_DESKTOP'
    };

    render(
      <ProductSelector
        catalog={mockPublicBootstrap.catalog}
        selection={photoSelection}
        defaultExpanded={true}
        onSelectProduct={handleSelect}
      />
    );

    // Filtered models should only show DT-2026 for PHOTO_DESKTOP
    expect(screen.getByText(/DT-2026 桌面全能拍照机/)).not.toBeNull();
    expect(screen.queryByText(/BT-400 旗舰沉浸拍照亭/)).toBeNull();
    expect(screen.queryByText(/SP-60 标准综合售货机/)).toBeNull();
  });

  it('T1-PROD-03: selecting a model displays hardware and software version dropdowns', () => {
    const handleSelect = vi.fn();
    const modelSelection: ProductSelection = {
      seriesCode: 'PHOTO_DESKTOP',
      modelCode: 'PHOTO-DT2026',
      hardwareVersionCode: '',
      softwareVersionCode: ''
    };

    render(
      <ProductSelector
        catalog={mockPublicBootstrap.catalog}
        selection={modelSelection}
        defaultExpanded={true}
        onSelectProduct={handleSelect}
      />
    );

    expect(screen.getByLabelText(/硬件版本/)).not.toBeNull();
    expect(screen.getByLabelText(/固件\/软件版本/)).not.toBeNull();

    expect(screen.getByText(/硬件 V1.0 \(基础切刀版\)/)).not.toBeNull();
    expect(screen.getByText(/硬件 V2.0 \(防夹手升级版\)/)).not.toBeNull();
    expect(screen.getByText(/软件 V3.2.1 \(正式发布版\)/)).not.toBeNull();
    expect(screen.getByText(/软件 V3.5.0 \(支持人脸美颜\)/)).not.toBeNull();
  });

  it('T1-PROD-04: selecting hardware/software version triggers onSelectProduct update', () => {
    const handleSelect = vi.fn();
    const modelSelection: ProductSelection = {
      seriesCode: 'PHOTO_DESKTOP',
      modelCode: 'PHOTO-DT2026',
      hardwareVersionCode: '',
      softwareVersionCode: ''
    };

    render(
      <ProductSelector
        catalog={mockPublicBootstrap.catalog}
        selection={modelSelection}
        defaultExpanded={true}
        onSelectProduct={handleSelect}
      />
    );

    const hwSelect = screen.getByLabelText(/硬件版本/);
    fireEvent.change(hwSelect, { target: { value: 'HW-V2.0' } });

    expect(handleSelect).toHaveBeenCalledWith({
      ...modelSelection,
      hardwareVersionCode: 'HW-V2.0'
    });

    const swSelect = screen.getByLabelText(/固件\/软件版本/);
    fireEvent.change(swSelect, { target: { value: 'SW-V3.5.0' } });

    expect(handleSelect).toHaveBeenCalledWith({
      ...modelSelection,
      softwareVersionCode: 'SW-V3.5.0'
    });
  });

  it('T1-PROD-05: renders human support contact banner with phone and online link', () => {
    const handleSelect = vi.fn();
    render(
      <ProductSelector
        catalog={mockPublicBootstrap.catalog}
        selection={initialSelection}
        defaultExpanded={true}
        onSelectProduct={handleSelect}
        humanContact={mockPublicBootstrap.project.humanContact}
      />
    );

    expect(screen.getByText('官方售后技术支持中心')).not.toBeNull();
    expect(screen.getByText('服务时间：周一至周日 08:30 - 22:30')).not.toBeNull();
    expect(screen.getByText('400-888-2026')).not.toBeNull();
    expect(screen.getByText('转人工服务')).not.toBeNull();
  });

  it('T2-PROD-01: when model has no hardware/software versions, version dropdowns are hidden', () => {
    const handleSelect = vi.fn();
    const noVersionSelection: ProductSelection = {
      seriesCode: 'PHOTO_BOOTH',
      modelCode: 'PHOTO-BT400',
      hardwareVersionCode: '',
      softwareVersionCode: ''
    };

    render(
      <ProductSelector
        catalog={mockPublicBootstrap.catalog}
        selection={noVersionSelection}
        defaultExpanded={true}
        onSelectProduct={handleSelect}
      />
    );

    // BT-400 has no versions configured in mock
    expect(screen.queryByLabelText(/硬件版本/)).toBeNull();
    expect(screen.queryByLabelText(/固件\/软件版本/)).toBeNull();
  });

  it('T2-PROD-02: prompts confirmation before switching model when active messages exist', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const handleSelect = vi.fn();

    const currentSelection: ProductSelection = {
      seriesCode: 'PHOTO_DESKTOP',
      modelCode: 'PHOTO-DT2026',
      hardwareVersionCode: 'HW-V1.0',
      softwareVersionCode: ''
    };

    render(
      <ProductSelector
        catalog={mockPublicBootstrap.catalog}
        selection={currentSelection}
        defaultExpanded={true}
        onSelectProduct={handleSelect}
        hasActiveMessages={true}
      />
    );

    const modelSelect = screen.getByLabelText(/设备型号/);
    fireEvent.change(modelSelect, { target: { value: 'PHOTO-BT400' } });

    expect(confirmSpy).toHaveBeenCalledWith('切换产品型号将重置当前会话记录，是否继续？');
    // Because user cancelled (confirm returned false), onSelectProduct should NOT be called
    expect(handleSelect).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('T2-PROD-03: allows model switch and resets child versions when user confirms switch', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const handleSelect = vi.fn();

    const currentSelection: ProductSelection = {
      seriesCode: 'PHOTO_DESKTOP',
      modelCode: 'PHOTO-DT2026',
      hardwareVersionCode: 'HW-V1.0',
      softwareVersionCode: ''
    };

    render(
      <ProductSelector
        catalog={mockPublicBootstrap.catalog}
        selection={currentSelection}
        defaultExpanded={true}
        onSelectProduct={handleSelect}
        hasActiveMessages={true}
      />
    );

    const modelSelect = screen.getByLabelText(/设备型号/);
    fireEvent.change(modelSelect, { target: { value: 'PHOTO-BT400' } });

    expect(confirmSpy).toHaveBeenCalled();
    expect(handleSelect).toHaveBeenCalledWith({
      seriesCode: 'PHOTO_BOOTH',
      modelCode: 'PHOTO-BT400',
      hardwareVersionCode: '',
      softwareVersionCode: ''
    });

    confirmSpy.mockRestore();
  });
});
