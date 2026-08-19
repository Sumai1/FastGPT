import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../../src/components/ChatInput';

describe('Tier 1 & 2 Component: Chat Input & Action Bar (F-19)', () => {
  it('T1-INP-01: renders textarea input and send button', () => {
    render(
      <ChatInput input="" onChange={vi.fn()} onSend={vi.fn()} onStop={vi.fn()} loading={false} />
    );

    expect(screen.getByLabelText('输入设备咨询问题')).not.toBeNull();
    expect(screen.getByTitle('发送问题 (Enter)')).not.toBeNull();
  });

  it('T1-INP-02: typing updates input via onChange callback', () => {
    const handleChange = vi.fn();
    render(
      <ChatInput
        input="测试输入"
        onChange={handleChange}
        onSend={vi.fn()}
        onStop={vi.fn()}
        loading={false}
      />
    );

    const textarea = screen.getByLabelText('输入设备咨询问题');
    fireEvent.change(textarea, { target: { value: '拍照机卡纸' } });

    expect(handleChange).toHaveBeenCalledWith('拍照机卡纸');
  });

  it('T1-INP-03: pressing Enter sends message', () => {
    const handleSend = vi.fn();
    render(
      <ChatInput
        input="屏幕黑屏"
        onChange={vi.fn()}
        onSend={handleSend}
        onStop={vi.fn()}
        loading={false}
      />
    );

    const textarea = screen.getByLabelText('输入设备咨询问题');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(handleSend).toHaveBeenCalledTimes(1);
  });

  it('T1-INP-04: pressing Shift+Enter does not trigger send (allows multiline newline)', () => {
    const handleSend = vi.fn();
    render(
      <ChatInput
        input="第一行"
        onChange={vi.fn()}
        onSend={handleSend}
        onStop={vi.fn()}
        loading={false}
      />
    );

    const textarea = screen.getByLabelText('输入设备咨询问题');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('T1-INP-05: renders stop button when loading is true and triggers onStop', () => {
    const handleStop = vi.fn();
    render(
      <ChatInput input="" onChange={vi.fn()} onSend={vi.fn()} onStop={handleStop} loading={true} />
    );

    const stopBtn = screen.getByTitle('中止本次回答生成');
    expect(stopBtn).not.toBeNull();

    fireEvent.click(stopBtn);
    expect(handleStop).toHaveBeenCalledTimes(1);
  });

  it('T2-INP-01: disables send button and textarea when disabled is true or input is empty', () => {
    render(
      <ChatInput
        input=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        onStop={vi.fn()}
        loading={false}
        disabled={true}
      />
    );

    const textarea = screen.getByLabelText('输入设备咨询问题') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);

    const sendBtn = screen.getByTitle('发送问题 (Enter)') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });
});
