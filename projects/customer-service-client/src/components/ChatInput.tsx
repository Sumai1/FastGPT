import React, { useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  input: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  loading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  onChange,
  onSend,
  onStop,
  loading,
  disabled,
  placeholder = '请输入您的问题（按 Enter 发送，Shift+Enter 换行）...'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="cs-input-area">
      <div className="cs-input-box">
        <textarea
          ref={textareaRef}
          className="cs-textarea"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={20000}
          rows={1}
          aria-label="输入咨询问题"
        />

        <div className="cs-input-actions">
          {loading ? (
            <button
              type="button"
              className="cs-btn cs-btn-danger cs-btn-sm"
              onClick={onStop}
              title="中止生成"
            >
              <Square size={13} fill="currentColor" />
              <span>停止</span>
            </button>
          ) : (
            <button
              type="button"
              className="cs-btn cs-btn-primary cs-btn-sm"
              disabled={disabled || !input.trim()}
              onClick={onSend}
              title="发送问题"
            >
              <Send size={13} />
              <span>发送</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
