import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getActiveSessionId,
  setActiveSessionId,
  generateSessionId,
  getSessionList,
  saveSessionList,
  getSessionMessages,
  saveSessionMessages,
  deleteSession,
  clearAllSessions,
  exportMessagesToMarkdown,
  downloadMarkdownFile
} from '../../src/services/session';
import type { ChatMessage, SessionSummary, ProductSelection } from '../../src/types';

describe('Tier 1 & 2 Unit: Session Management, Local Storage & Markdown Export', () => {
  const projectKey = 'DEMO_PROJECT';

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('T1-SES-01: generates and retrieves consistent active session ID', () => {
    const id1 = getActiveSessionId(projectKey);
    expect(id1).toBeTruthy();

    const id2 = getActiveSessionId(projectKey);
    expect(id2).toBe(id1);

    setActiveSessionId(projectKey, 'custom-session-123');
    expect(getActiveSessionId(projectKey)).toBe('custom-session-123');
  });

  it('T1-SES-02: saves and retrieves session messages and updates summary list', () => {
    const sessionId = 'session-001';
    const messages: ChatMessage[] = [
      { role: 'user', content: '拍照机卡纸怎么办？', requestId: 'r1', sessionId },
      { role: 'assistant', content: '请按以下步骤清理卡纸...', requestId: 'r1', sessionId }
    ];
    const selection: ProductSelection = {
      seriesCode: 'PHOTO_DESKTOP',
      modelCode: 'PHOTO-DT2026',
      hardwareVersionCode: 'HW-V1.0',
      softwareVersionCode: ''
    };

    saveSessionMessages({ projectKey, sessionId, messages, selection });

    const loadedMsgs = getSessionMessages(projectKey, sessionId);
    expect(loadedMsgs.length).toBe(2);
    expect(loadedMsgs[0].content).toBe('拍照机卡纸怎么办？');

    const sessionList = getSessionList(projectKey);
    expect(sessionList.length).toBe(1);
    expect(sessionList[0].id).toBe(sessionId);
    expect(sessionList[0].title).toBe('拍照机卡纸怎么办？');
    expect(sessionList[0].preview).toContain('请按以下步骤清理卡纸');
    expect(sessionList[0].messageCount).toBe(2);
    expect(sessionList[0].selection?.modelCode).toBe('PHOTO-DT2026');
  });

  it('T1-SES-03: deleting a session removes message storage and updates list', () => {
    const s1 = 'session-1';
    const s2 = 'session-2';

    saveSessionMessages({
      projectKey,
      sessionId: s1,
      messages: [{ role: 'user', content: '问题1' }]
    });
    saveSessionMessages({
      projectKey,
      sessionId: s2,
      messages: [{ role: 'user', content: '问题2' }]
    });

    expect(getSessionList(projectKey).length).toBe(2);

    deleteSession(projectKey, s1);

    const listAfter = getSessionList(projectKey);
    expect(listAfter.length).toBe(1);
    expect(listAfter[0].id).toBe(s2);
    window.sessionStorage.clear();
    expect(getSessionMessages(projectKey, s1)).toEqual([]);
  });

  it('T1-SES-04: clearAllSessions removes all session data and active ID', () => {
    saveSessionMessages({
      projectKey,
      sessionId: 'session-a',
      messages: [{ role: 'user', content: '问题 A' }]
    });
    setActiveSessionId(projectKey, 'session-a');

    clearAllSessions(projectKey);

    expect(getSessionList(projectKey)).toEqual([]);
    expect(getSessionMessages(projectKey, 'session-a')).toEqual([]);
  });

  it('T1-SES-05: exportMessagesToMarkdown formats full transcript with citations and metadata', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: '售货机未出货' },
      {
        role: 'assistant',
        content: '正在处理退款',
        response: {
          requestId: 'r1',
          sessionId: 's1',
          messageId: 'm1',
          status: 'answered' as any,
          answer: '正在处理退款',
          safetyWarning: '注意防夹',
          citations: [{ title: '退款SOP', summary: '自动原路退回', score: 0.95 }]
        } as any
      }
    ];

    const md = exportMessagesToMarkdown({
      projectName: '智能设备客服',
      sessionId: 'sess-999',
      messages,
      selection: {
        seriesCode: 'VEND_SPRING',
        modelCode: 'VEND-SP60',
        hardwareVersionCode: '',
        softwareVersionCode: ''
      }
    });

    expect(md).toContain('# 智能设备客服 - 对话记录');
    expect(md).toContain('`sess-999`');
    expect(md).toContain('### 用户 (#1)');
    expect(md).toContain('售货机未出货');
    expect(md).toContain('### 智能客服 (#2)');
    expect(md).toContain('> **安全警告**：注意防夹');
    expect(md).toContain('退款SOP: 自动原路退回');
  });

  it('T2-SES-01: caps maximum session list at 50 entries', () => {
    const mockSessions: SessionSummary[] = Array.from({ length: 60 }, (_, i) => ({
      id: `session-${i}`,
      title: `会话 ${i}`,
      createdAt: Date.now() - i * 1000,
      updatedAt: Date.now() - i * 1000,
      messageCount: 1,
      preview: `预览 ${i}`
    }));

    saveSessionList(projectKey, mockSessions);

    const saved = getSessionList(projectKey);
    expect(saved.length).toBe(50);
    expect(saved[0].id).toBe('session-0');
    expect(saved[49].id).toBe('session-49');
  });

  it('T2-SES-02: gracefully handles corrupt JSON in localStorage without throwing', () => {
    window.localStorage.setItem(`fastgpt-cs-sessions:${projectKey}`, '{ invalid json ...');
    window.localStorage.setItem(`fastgpt-cs-msgs:${projectKey}:corrupt-id`, 'invalid[]');

    expect(getSessionList(projectKey)).toEqual([]);
    expect(getSessionMessages(projectKey, 'corrupt-id')).toEqual([]);
  });

  it('T2-SES-03: downloadMarkdownFile creates blob URL and triggers download link click', () => {
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    downloadMarkdownFile('test-export.md', '# Test Content');

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
