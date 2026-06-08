import React, { useCallback, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Input, Button, Space, Tooltip, message } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import {
  BoldOutlined,
  ItalicOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  CodeOutlined,
  LinkOutlined,
  PictureOutlined,
  MessageOutlined,
  FontSizeOutlined,
  MinusOutlined,
  TableOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { TextArea } = Input;

export interface MarkdownEditorHandle {
  getTextarea: () => HTMLTextAreaElement | null;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// 工具栏按钮配置
const toolbarButtons = [
  { icon: <FontSizeOutlined />, title: '标题', prefix: '## ', suffix: '' },
  { icon: <BoldOutlined />, title: '粗体', prefix: '**', suffix: '**' },
  { icon: <ItalicOutlined />, title: '斜体', prefix: '*', suffix: '*' },
  { icon: <MessageOutlined />, title: '引用', prefix: '> ', suffix: '' },
  { icon: <UnorderedListOutlined />, title: '无序列表', prefix: '- ', suffix: '' },
  { icon: <OrderedListOutlined />, title: '有序列表', prefix: '1. ', suffix: '' },
  { icon: <CodeOutlined />, title: '代码', prefix: '`', suffix: '`' },
  { icon: <LinkOutlined />, title: '链接', prefix: '[', suffix: '](url)' },
  { icon: <PictureOutlined />, title: '图片', prefix: '![alt](', suffix: ')' },
  { icon: <TableOutlined />, title: '表格', prefix: '| 列1 | 列2 |\n| --- | --- |\n| ', suffix: ' |' },
  { icon: <MinusOutlined />, title: '分割线', prefix: '\n---\n', suffix: '' },
];

const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(({
  value,
  onChange,
  placeholder = '在此输入 Markdown 内容...',
}, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const textareaRef = useRef<TextAreaRef | null>(null);

  const getTextarea = useCallback(() => {
    return textareaRef.current?.resizableTextArea?.textArea ?? null;
  }, []);

  useImperativeHandle(ref, () => ({
    getTextarea,
  }), [getTextarea]);

  const restoreEditorState = useCallback((cursorStart: number, cursorEnd: number, scrollTop: number, scrollLeft: number) => {
    requestAnimationFrame(() => {
      const textarea = getTextarea();
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
    });
  }, [getTextarea]);

  // 处理工具栏按钮点击
  const handleToolbarClick = useCallback(
    (prefix: string, suffix: string) => {
      const textarea = getTextarea();
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      const selectedText = value.substring(start, end);
      const newText =
        value.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        value.substring(end);

      onChange(newText);

      const newCursorPos = start + prefix.length + selectedText.length;
      restoreEditorState(newCursorPos, newCursorPos, scrollTop, scrollLeft);
    },
    [getTextarea, onChange, restoreEditorState, value]
  );

  // 处理文本变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // 处理Tab键
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const scrollTop = textarea.scrollTop;
        const scrollLeft = textarea.scrollLeft;
        const newText =
          value.substring(0, start) + '  ' + value.substring(end);
        onChange(newText);

        restoreEditorState(start + 2, start + 2, scrollTop, scrollLeft);
      }
    },
    [onChange, restoreEditorState, value]
  );

  // 处理拖拽进入
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  // 处理拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  // 处理拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理文件放置
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      const fileName = file.name.toLowerCase();

      if (!fileName.endsWith('.md') && !fileName.endsWith('.markdown') && !fileName.endsWith('.txt')) {
        message.warning('请拖入 .md 或 .txt 文件');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onChange(content);
          message.success(`已加载文件: ${file.name}`);
        }
      };
      reader.onerror = () => {
        message.error('文件读取失败');
      };
      reader.readAsText(file);
    },
    [onChange]
  );

  return (
    <div
      className="markdown-editor"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 工具栏 */}
      <div
        className="toolbar"
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #f0f0f0',
          background: 'transparent',
          flexShrink: 0,
        }}
      >
        <Space size={2} wrap>
          {toolbarButtons.map((btn, index) => (
            <Tooltip key={index} title={btn.title}>
              <Button
                type="text"
                size="small"
                icon={btn.icon}
                onClick={() => handleToolbarClick(btn.prefix, btn.suffix)}
                style={{ color: '#666' }}
              />
            </Tooltip>
          ))}
        </Space>
      </div>

      {/* 编辑区 */}
      <TextArea
        ref={textareaRef}
        className="md-editor-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          flex: 1,
          width: '100%',
          fontSize: '14px',
          lineHeight: '1.7',
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Courier New", monospace',
          border: 'none',
          borderRadius: 0,
          resize: 'none',
          padding: '16px',
          background: 'transparent',
        }}
      />

      {/* 拖拽遮罩层 */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(22, 119, 255, 0.1)',
            border: '2px dashed #1677ff',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <FileTextOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <span style={{ fontSize: 16, color: '#1677ff', fontWeight: 500 }}>
            释放以加载 Markdown 文件
          </span>
        </div>
      )}
    </div>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;
