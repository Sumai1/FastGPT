import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackModal } from '../../src/components/FeedbackModal';

describe('Tier 1 & 2 Component: Multi-dimensional Feedback Modal (F-18)', () => {
  it('T1-FDB-01: does not render anything when isOpen is false', () => {
    const { container } = render(
      <FeedbackModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('T1-FDB-02: renders all preset reason buttons and textarea when isOpen is true', () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByText('问题未解决反馈')).not.toBeNull();
    expect(screen.getByText('回答不准确')).not.toBeNull();
    expect(screen.getByText('未找到相关解决方案')).not.toBeNull();
    expect(screen.getByText('操作步骤不清晰')).not.toBeNull();
    expect(screen.getByText('资料内容已过时')).not.toBeNull();
    expect(screen.getByText('设备型号不匹配')).not.toBeNull();
    expect(screen.getByText('建议转人工处理')).not.toBeNull();
    expect(screen.getByPlaceholderText(/请补充具体说明/)).not.toBeNull();
  });

  it('T1-FDB-03: selecting a preset reason highlights it and submitting passes combined text', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <FeedbackModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        defaultType="unresolved"
      />
    );

    const reasonBtn = screen.getByText('操作步骤不清晰');
    fireEvent.click(reasonBtn);

    const textarea = screen.getByPlaceholderText(/请补充具体说明/);
    fireEvent.change(textarea, { target: { value: '步骤3中未说明切刀卡扣的具体位置' } });

    const submitBtn = screen.getByText('提交反馈');
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith(
      'unresolved',
      '操作步骤不清晰；步骤3中未说明切刀卡扣的具体位置'
    );
  });

  it('T1-FDB-04: clicking cancel triggers onClose callback', () => {
    const handleClose = vi.fn();
    render(<FeedbackModal isOpen={true} onClose={handleClose} onSubmit={vi.fn()} />);

    const cancelBtn = screen.getByText('取消');
    fireEvent.click(cancelBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('T2-FDB-01: toggling a preset reason deselects it', () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);

    const reasonBtn = screen.getByText('资料内容已过时');
    fireEvent.click(reasonBtn);
    expect(reasonBtn.classList.contains('selected')).toBe(true);

    fireEvent.click(reasonBtn);
    expect(reasonBtn.classList.contains('selected')).toBe(false);
  });
});
