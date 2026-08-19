import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from '../../src/components/MessageList';
import {
  mockChatResponseAnswered,
  mockChatResponseWithDanger,
  mockChatResponseWithCandidates
} from '../mocks/mockData';
import type { ChatMessage } from '../../src/types';

describe('Tier 1 & 2 Component: MessageList, Citation Accordion & Safety Dispatch', () => {
  it('T1-MSG-01: renders welcome hero, recommended questions and guide tools when messages list is empty', () => {
    const handleSelectQuestion = vi.fn();
    render(
      <MessageList
        messages={[]}
        welcomeText="欢迎使用智能客服"
        recommendedQuestions={['推荐问题 1', '推荐问题 2']}
        onSelectQuestion={handleSelectQuestion}
        onFeedback={vi.fn()}
        onOpenFeedbackModal={vi.fn()}
      />
    );

    expect(screen.getByText('欢迎使用智能客服')).not.toBeNull();
    expect(screen.getByText('推荐问题 1')).not.toBeNull();
    expect(screen.getByText('推荐问题 2')).not.toBeNull();
    expect(screen.getByText('拍照机 卡纸/切刀阻滞排查')).not.toBeNull();
    expect(screen.getByText('售货机 扣款未掉货应急处理')).not.toBeNull();
    expect(screen.getByText('错误代码秒查 (E-01 / V-101)')).not.toBeNull();
  });

  it('T1-MSG-02: renders user message bubble and assistant message bubble', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: '请问拍照机如何加纸？' },
      { role: 'assistant', content: '加纸步骤如下：打开前门，放入相纸卷。' }
    ];

    render(
      <MessageList
        messages={messages}
        onSelectQuestion={vi.fn()}
        onFeedback={vi.fn()}
        onOpenFeedbackModal={vi.fn()}
      />
    );

    expect(screen.getByText('请问拍照机如何加纸？')).not.toBeNull();
    expect(screen.getByText('加纸步骤如下：打开前门，放入相纸卷。')).not.toBeNull();
  });

  it('T1-MSG-03: automatically extracts numbered steps in assistant message and renders TroubleshootCard', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: '拍照机卡纸' },
      {
        role: 'assistant',
        content: `请按以下步骤排查：
1. 切断设备总电源
2. 打开打印机前仓门
3. 取出卡阻相纸`
      }
    ];

    render(
      <MessageList
        messages={messages}
        onSelectQuestion={vi.fn()}
        onFeedback={vi.fn()}
        onOpenFeedbackModal={vi.fn()}
      />
    );

    expect(screen.getByText('交互式步骤排查清单（可逐项勾选）')).not.toBeNull();
    expect(screen.getByText('切断设备总电源')).not.toBeNull();
    expect(screen.getByText('打开打印机前仓门')).not.toBeNull();
    expect(screen.getByText('取出卡阻相纸')).not.toBeNull();
  });

  it('T1-MSG-04: triggers SafetyAlertCard when high voltage / live disassembly keywords are detected', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: '怎么带电拆机测高压？' },
      {
        role: 'assistant',
        content: '严禁带电拆机！220V高压电源具有触电危险。',
        response: mockChatResponseWithDanger
      }
    ];

    render(
      <MessageList
        messages={messages}
        onSelectQuestion={vi.fn()}
        onFeedback={vi.fn()}
        onOpenFeedbackModal={vi.fn()}
      />
    );

    expect(screen.getByText('阻断级高危电气安全警示')).not.toBeNull();
    expect(screen.getByText(/检测到高压电与带电拆机危险/)).not.toBeNull();
  });

  it('T1-MSG-05: toggles knowledge citations accordion and displays similarity score', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: '相纸卡阻' },
      {
        role: 'assistant',
        content: '排障完成',
        response: mockChatResponseAnswered
      }
    ];

    render(
      <MessageList
        messages={messages}
        onSelectQuestion={vi.fn()}
        onFeedback={vi.fn()}
        onOpenFeedbackModal={vi.fn()}
      />
    );

    const citationTrigger = screen.getByText(/知识库参考来源 \(4\)/);
    expect(citationTrigger).not.toBeNull();

    // Expand citations
    fireEvent.click(citationTrigger);

    expect(screen.getByText('【故障排查卡】DT-2026 打印机相纸卡阻标准处理 SOP')).not.toBeNull();
    expect(screen.getByText('匹配度 94%')).not.toBeNull();
    expect(screen.getByText(/按压前仓门释放卡扣并顺着进纸反方向平稳取出/)).not.toBeNull();
  });

  it('T1-MSG-06: renders ambiguous candidate model chips and triggers selection', () => {
    const handleSelectModel = vi.fn();
    const messages: ChatMessage[] = [
      { role: 'user', content: '闪光灯怎么调' },
      {
        role: 'assistant',
        content: '请确认您的机型',
        response: mockChatResponseWithCandidates
      }
    ];

    render(
      <MessageList
        messages={messages}
        onSelectQuestion={vi.fn()}
        onSelectCandidateModel={handleSelectModel}
        onFeedback={vi.fn()}
        onOpenFeedbackModal={vi.fn()}
      />
    );

    expect(screen.getByText('检测到相关设备型号，请确认您的机型：')).not.toBeNull();

    const dt2026Chip = screen.getByText('DT-2026 桌面全能拍照机');
    fireEvent.click(dt2026Chip);

    expect(handleSelectModel).toHaveBeenCalledWith('PHOTO-DT2026');
  });

  it('T1-MSG-07: triggers feedback actions (good, bad, unresolved)', () => {
    const handleFeedback = vi.fn();
    const handleOpenFeedbackModal = vi.fn();

    const messages: ChatMessage[] = [
      { role: 'user', content: '测试' },
      {
        role: 'assistant',
        content: '测试回答',
        response: mockChatResponseAnswered
      }
    ];

    render(
      <MessageList
        messages={messages}
        onSelectQuestion={vi.fn()}
        onFeedback={handleFeedback}
        onOpenFeedbackModal={handleOpenFeedbackModal}
      />
    );

    const goodBtn = screen.getByTitle('有帮助');
    fireEvent.click(goodBtn);
    expect(handleFeedback).toHaveBeenCalledWith(1, 'good');

    const badBtn = screen.getByTitle('无帮助');
    fireEvent.click(badBtn);
    expect(handleOpenFeedbackModal).toHaveBeenCalledWith(1, mockChatResponseAnswered, 'bad');

    const unresolvedBtn = screen.getByTitle('问题仍未解决？点击反馈');
    fireEvent.click(unresolvedBtn);
    expect(handleOpenFeedbackModal).toHaveBeenCalledWith(1, mockChatResponseAnswered, 'unresolved');
  });

  it('T2-MSG-01: renders retry button when assistant message has canRetry true', () => {
    const handleRetry = vi.fn();
    const messages: ChatMessage[] = [
      { role: 'user', content: '网络错误测试' },
      {
        role: 'assistant',
        content: '网络异常，生成失败',
        canRetry: true
      }
    ];

    render(
      <MessageList
        messages={messages}
        onSelectQuestion={vi.fn()}
        onFeedback={vi.fn()}
        onOpenFeedbackModal={vi.fn()}
        onRetryMessage={handleRetry}
      />
    );

    const retryBtn = screen.getByTitle('重新生成此回答');
    fireEvent.click(retryBtn);

    expect(handleRetry).toHaveBeenCalledWith(1);
  });
});
