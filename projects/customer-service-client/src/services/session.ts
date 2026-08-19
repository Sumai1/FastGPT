import type { ChatMessage, SessionSummary, ProductSelection } from '../types';

const SESSION_LIST_PREFIX = 'fastgpt-cs-sessions';
const SESSION_MESSAGES_PREFIX = 'fastgpt-cs-msgs';
const CURRENT_SESSION_PREFIX = 'fastgpt-cs-current-session';

/** 获取当前活跃会话 ID */
export const getActiveSessionId = (projectKey: string): string => {
  if (typeof window === 'undefined') return 'session-ssr';
  const key = `${CURRENT_SESSION_PREFIX}:${projectKey}`;
  const saved = window.localStorage.getItem(key);
  if (saved) return saved;

  const newId = generateSessionId();
  window.localStorage.setItem(key, newId);
  return newId;
};

/** 设置当前活跃会话 ID */
export const setActiveSessionId = (projectKey: string, sessionId: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${CURRENT_SESSION_PREFIX}:${projectKey}`, sessionId);
};

/** 生成唯一会话 ID */
export const generateSessionId = (): string => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `cs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/** 获取所有历史会话摘要列表 */
export const getSessionList = (projectKey: string): SessionSummary[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${SESSION_LIST_PREFIX}:${projectKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
};

/** 保存/更新会话列表 */
export const saveSessionList = (projectKey: string, sessions: SessionSummary[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${SESSION_LIST_PREFIX}:${projectKey}`,
      JSON.stringify(sessions.slice(0, 50)) // 最多保留最近 50 个会话
    );
  } catch {
    // 忽略 localStorage 写入错误
  }
};

/** 加载指定会话的消息记录 */
export const getSessionMessages = (projectKey: string, sessionId: string): ChatMessage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(
      `${SESSION_MESSAGES_PREFIX}:${projectKey}:${sessionId}`
    );
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is ChatMessage =>
            !!item &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string'
        );
      }
    }

    // 仅在请求当前活跃会话时兼容旧版 sessionStorage 单会话数据
    const activeSessionId = window.localStorage.getItem(`${CURRENT_SESSION_PREFIX}:${projectKey}`);
    if (activeSessionId === sessionId) {
      const legacy = window.sessionStorage.getItem(`fastgpt-cs-messages:${projectKey}`);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    return [];
  }
  return [];
};

/** 保存指定会话的消息记录并同步更新摘要 */
export const saveSessionMessages = ({
  projectKey,
  sessionId,
  messages,
  selection
}: {
  projectKey: string;
  sessionId: string;
  messages: ChatMessage[];
  selection?: ProductSelection;
}): void => {
  if (typeof window === 'undefined') return;

  try {
    // 1. 存储消息记录
    window.localStorage.setItem(
      `${SESSION_MESSAGES_PREFIX}:${projectKey}:${sessionId}`,
      JSON.stringify(messages)
    );

    // 2. 兼容旧版 sessionStorage
    window.sessionStorage.setItem(`fastgpt-cs-messages:${projectKey}`, JSON.stringify(messages));

    // 3. 更新会话列表摘要
    if (messages.length > 0) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const lastMsg = messages[messages.length - 1];

      const rawTitle = firstUserMsg ? firstUserMsg.content.trim() : '新咨询会话';
      const title = rawTitle.length > 30 ? `${rawTitle.slice(0, 30)}...` : rawTitle;
      const preview = lastMsg ? lastMsg.content.replace(/\s+/g, ' ').slice(0, 60) : '暂无消息';

      const existingList = getSessionList(projectKey);
      const existingIdx = existingList.findIndex((s) => s.id === sessionId);

      const now = Date.now();
      const updatedItem: SessionSummary = {
        id: sessionId,
        title,
        preview,
        messageCount: messages.length,
        createdAt: existingIdx >= 0 ? existingList[existingIdx].createdAt : now,
        updatedAt: now,
        selection
      };

      let newList: SessionSummary[];
      if (existingIdx >= 0) {
        newList = [updatedItem, ...existingList.filter((s) => s.id !== sessionId)];
      } else {
        newList = [updatedItem, ...existingList];
      }

      saveSessionList(projectKey, newList);
    }
  } catch {
    // 忽略存储超限错误
  }
};

/** 删除单个会话 */
export const deleteSession = (projectKey: string, sessionId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${SESSION_MESSAGES_PREFIX}:${projectKey}:${sessionId}`);
    const list = getSessionList(projectKey).filter((s) => s.id !== sessionId);
    saveSessionList(projectKey, list);

    // 如果删除的是当前会话，清除激活状态
    const active = window.localStorage.getItem(`${CURRENT_SESSION_PREFIX}:${projectKey}`);
    if (active === sessionId) {
      window.localStorage.removeItem(`${CURRENT_SESSION_PREFIX}:${projectKey}`);
      window.sessionStorage.removeItem(`fastgpt-cs-messages:${projectKey}`);
    }
  } catch {
    // 忽略异常
  }
};

/** 清空所有历史会话 */
export const clearAllSessions = (projectKey: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const list = getSessionList(projectKey);
    for (const item of list) {
      window.localStorage.removeItem(`${SESSION_MESSAGES_PREFIX}:${projectKey}:${item.id}`);
    }
    window.localStorage.removeItem(`${SESSION_LIST_PREFIX}:${projectKey}`);
    window.localStorage.removeItem(`${CURRENT_SESSION_PREFIX}:${projectKey}`);
    window.sessionStorage.removeItem(`fastgpt-cs-messages:${projectKey}`);
  } catch {
    // 忽略异常
  }
};

/** 导出消息列表为 Markdown 格式 */
export const exportMessagesToMarkdown = ({
  projectName = '智能客服咨询',
  sessionId,
  messages,
  selection
}: {
  projectName?: string;
  sessionId?: string;
  messages: ChatMessage[];
  selection?: ProductSelection;
}): string => {
  const timeStr = new Date().toLocaleString('zh-CN', { hour12: false });
  const lines: string[] = [];

  lines.push(`# ${projectName} - 对话记录`);
  lines.push('');
  lines.push(`- **导出时间**：${timeStr}`);
  if (sessionId) lines.push(`- **会话编号**：\`${sessionId}\``);
  if (selection?.modelCode) {
    lines.push(`- **咨询型号**：\`${selection.modelCode}\``);
  }
  lines.push(`- **消息总数**：${messages.length} 条`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isUser = msg.role === 'user';
    lines.push(`### ${isUser ? '用户' : '智能客服'} (#${i + 1})`);
    lines.push('');
    lines.push(msg.content || '*(无文本内容)*');
    lines.push('');

    if (msg.response?.safetyWarning) {
      lines.push(`> **安全警告**：${msg.response.safetyWarning}`);
      lines.push('');
    }

    if (msg.response?.citations && msg.response.citations.length > 0) {
      lines.push('**引用来源**：');
      for (const cite of msg.response.citations) {
        lines.push(`- ${cite.title}: ${cite.summary}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
};

/** 触发 Markdown 文件下载 */
export const downloadMarkdownFile = (filename: string, content: string): void => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
