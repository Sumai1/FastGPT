import { describe, it, expect } from 'vitest';
import { exportMessagesToMarkdown, generateSessionId } from '../../src/services/session';
import type { ChatMessage } from '../../src/types';

describe('Session Utilities & Markdown Export', () => {
  it('should generate valid unique session IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('should format full conversation history to structured markdown document', () => {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: '拍照机打印机卡纸了怎么办？'
      },
      {
        role: 'assistant',
        content: '请先切断总电源，随后打开前仓门取出卡纸。',
        response: {
          answer: '请先切断总电源，随后打开前仓门取出卡纸。',
          status: 'success',
          sessionId: 'test-session-123',
          messageId: 'msg-456',
          safetyWarning: '注意：切断电源后方可开仓！',
          citations: [
            {
              title: '拍照机卡纸排查 SOP',
              summary: '断电后顺着滚轴方向取出卡纸',
              score: 0.95
            }
          ]
        }
      }
    ];

    const md = exportMessagesToMarkdown({
      projectName: '自助拍照机客服',
      sessionId: 'test-session-123',
      messages,
      selection: {
        seriesCode: 'PHOTO_DESKTOP',
        modelCode: 'PHOTO-DT2026',
        hardwareVersionCode: 'HW-V2.0',
        softwareVersionCode: 'SW-V3.5.0'
      }
    });

    expect(md).toContain('# 自助拍照机客服 - 对话记录');
    expect(md).toContain('test-session-123');
    expect(md).toContain('### 用户 (#1)');
    expect(md).toContain('### 智能客服 (#2)');
    expect(md).toContain('拍照机打印机卡纸了怎么办？');
    expect(md).toContain('请先切断总电源');
    expect(md).toContain('安全警告');
    expect(md).toContain('拍照机卡纸排查 SOP');
  });
});
