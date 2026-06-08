import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  Layout,
  Button,
  Dropdown,
  message,
  Modal,
  Typography,
  Space,
  ConfigProvider,
  Segmented,
  Tooltip,
} from 'antd';
import {
  HistoryOutlined,
  FileTextOutlined,
  SettingOutlined,
  DownloadOutlined,
  WechatOutlined,
  PictureOutlined,
  FilePdfOutlined,
  CodeOutlined,
  CloseOutlined,
  CopyOutlined,
  AppstoreOutlined,
  MailOutlined,
  BookOutlined,
  GithubOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

import MarkdownEditor from './components/MarkdownEditor';
import Preview from './components/Preview';
import HistoryPanel from './components/HistoryPanel';
import TemplateSelector from './components/TemplateSelector';
import SettingsPanel from './components/SettingsPanel';
import DocsModal from './components/DocsModal';
import { useStore, AUTO_SAVE_INTERVAL } from './store/useStore';
import { exportContent, xiaohongshuSizeOptions, xiaohongshuSplitOptions } from './utils/export';
import { getTemplateById, getTemplatesByFormat } from './templates';
import { getSampleByFormat } from './utils/sampleContent';
import { getTextStats } from './utils/stats';
import type { OutputFormat, XiaohongshuSize, XiaohongshuSplitMode } from './types';
import type { MarkdownEditorHandle } from './components/MarkdownEditor';

import './App.css';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

// 格式配置
const formatOptions = [
  { value: 'wechat', label: '微信', icon: <WechatOutlined /> },
  { value: 'xiaohongshu', label: '小红书', icon: <PictureOutlined /> },
  { value: 'email', label: '邮件', icon: <MailOutlined /> },
  { value: 'resume', label: '简历', icon: <FileTextOutlined /> },
  { value: 'general', label: '通用', icon: <AppstoreOutlined /> },
];

// 通用格式导出选项
const generalExportOptions = [
  { key: 'image', label: '导出图片', icon: <PictureOutlined /> },
  { key: 'pdf', label: '导出PDF', icon: <FilePdfOutlined /> },
  { key: 'copyHtml', label: '复制HTML代码', icon: <CopyOutlined /> },
  { key: 'downloadHtml', label: '导出HTML', icon: <CodeOutlined /> },
];

const getXiaohongshuPreviewSize = (size: XiaohongshuSize) => {
  const option = xiaohongshuSizeOptions.find(opt => opt.value === size);
  return option ? { width: option.width, height: option.height } : undefined;
};

const App: React.FC = () => {
  // 状态
  const [historyVisible, setHistoryVisible] = useState(false);
  const [docsVisible, setDocsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [xiaohongshuSize, setXiaohongshuSize] = useState<XiaohongshuSize>('vertical');
  const [xiaohongshuSplitMode, setXiaohongshuSplitMode] = useState<XiaohongshuSplitMode>('hr');

  // Store
  const {
    markdownContent,
    outputFormat,
    selectedTemplateId,
    settings,
    settingsPanelVisible,
    history,
    setMarkdownContent,
    setOutputFormat,
    setSelectedTemplateId,
    setSettings,
    setSettingsPanelVisible,
    autoSave,
    deleteFromHistory,
    clearHistory,
    loadFromHistory,
  } = useStore();

  // 预览区域引用
  const previewRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const isSyncingScroll = useRef(false);

  // 当前模板
  const currentTemplate = getTemplateById(selectedTemplateId);
  const xiaohongshuPreviewSize = useMemo(
    () => getXiaohongshuPreviewSize(xiaohongshuSize),
    [xiaohongshuSize]
  );

  // 文本统计
  const textStats = useMemo(() => getTextStats(markdownContent), [markdownContent]);

  // 当格式改变时，选择该格式的第一个模板
  useEffect(() => {
    const templates = getTemplatesByFormat(outputFormat);
    if (templates.length > 0 && !templates.find(t => t.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [outputFormat, selectedTemplateId, setSelectedTemplateId]);

  // 自动保存 - 每1分钟
  useEffect(() => {
    const interval = setInterval(() => {
      autoSave();
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [autoSave]);

  // 协同滚动效果
  useEffect(() => {
    const editorEl = editorRef.current?.getTextarea() ?? null;
    const previewEl = previewScrollRef.current;
    if (!editorEl || !previewEl) return;

    const handleEditorScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      const editorRange = editorEl.scrollHeight - editorEl.clientHeight;
      const previewRange = previewEl.scrollHeight - previewEl.clientHeight;
      const scrollRatio = editorRange > 0 ? editorEl.scrollTop / editorRange : 0;
      previewEl.scrollTop = scrollRatio * Math.max(previewRange, 0);
      requestAnimationFrame(() => { isSyncingScroll.current = false; });
    };

    const handlePreviewScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      const previewRange = previewEl.scrollHeight - previewEl.clientHeight;
      const editorRange = editorEl.scrollHeight - editorEl.clientHeight;
      const scrollRatio = previewRange > 0 ? previewEl.scrollTop / previewRange : 0;
      editorEl.scrollTop = scrollRatio * Math.max(editorRange, 0);
      requestAnimationFrame(() => { isSyncingScroll.current = false; });
    };

    editorEl.addEventListener('scroll', handleEditorScroll);
    previewEl.addEventListener('scroll', handlePreviewScroll);
    return () => {
      editorEl.removeEventListener('scroll', handleEditorScroll);
      previewEl.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [markdownContent]);

  // 导出处理
  const handleExport = useCallback(async () => {
    if (!markdownContent.trim()) {
      message.warning('请先输入内容');
      return;
    }
    setLoading(true);
    try {
      const result = await exportContent(
        outputFormat,
        markdownContent,
        selectedTemplateId,
        previewRef.current || undefined,
        undefined,
        settings,
        xiaohongshuSize,
        xiaohongshuSplitMode
      );
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch {
      message.error('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [markdownContent, outputFormat, selectedTemplateId, settings, xiaohongshuSize, xiaohongshuSplitMode]);

  // 通用格式导出处理
  const handleGeneralExport = useCallback(async (type: 'image' | 'pdf' | 'copyHtml' | 'downloadHtml') => {
    if (!markdownContent.trim()) {
      message.warning('请先输入内容');
      return;
    }
    setLoading(true);
    try {
      let result;
      if (type === 'copyHtml') {
        // 复制HTML代码到剪贴板
        const { markdownToStyledHTML } = await import('./utils/export/html');
        const template = getTemplateById(selectedTemplateId);
        if (!template) {
          result = { success: false, message: '模板未找到' };
        } else {
          const html = markdownToStyledHTML(markdownContent, template, settings);
          await navigator.clipboard.writeText(html);
          result = { success: true, message: 'HTML代码已复制到剪贴板' };
        }
      } else {
        result = await exportContent(
          type,
          markdownContent,
          selectedTemplateId,
          previewRef.current || undefined,
          undefined,
          settings
        );
      }
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    } catch {
      message.error('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [markdownContent, selectedTemplateId, settings]);

  // 加载示例内容（根据当前格式自动选择）
  const loadSample = useCallback(() => {
    const sample = getSampleByFormat(outputFormat);
    setMarkdownContent(sample);
    const formatNames: Record<OutputFormat, string> = {
      wechat: '微信',
      xiaohongshu: '小红书',
      email: '邮件',
      resume: '简历',
      general: '通用',
    };
    message.success(`${formatNames[outputFormat]}示例已加载`);
  }, [outputFormat, setMarkdownContent]);

  const handleFormatChange = useCallback((format: OutputFormat) => setOutputFormat(format), [setOutputFormat]);
  const handleTemplateChange = useCallback((templateId: string) => setSelectedTemplateId(templateId), [setSelectedTemplateId]);
  const handleLoadFromHistory = useCallback((id: string) => {
    loadFromHistory(id);
    setHistoryVisible(false);
    message.success('已加载历史记录');
  }, [loadFromHistory]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 12,
          fontSize: 15,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#f5f6f8' }}>
        {/* 顶部导航 */}
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: 60,
            background: '#fff',
            borderBottom: '1px solid #e8e8e8',
          }}
        >
          {/* 左侧：Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
            <img
              src="/logo.jpg"
              alt="Logo"
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Text strong style={{ fontSize: 17, color: '#1f1f1f', lineHeight: 1.2 }}>
                MD2Anything
              </Text>
              <Text style={{ fontSize: 11, color: '#999', lineHeight: 1.2 }}>
                Markdown is all you need
              </Text>
            </div>
          </div>

          {/* 中间：格式选择 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Segmented
              value={outputFormat}
              onChange={(value) => handleFormatChange(value as OutputFormat)}
              options={formatOptions.map(opt => ({
                value: opt.value,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px' }}>
                    {opt.icon}
                    <span style={{ fontSize: 14 }}>{opt.label}</span>
                  </div>
                ),
              }))}
              style={{ background: '#f0f0f0', padding: 4 }}
              size="large"
            />
          </div>

          {/* 右侧：操作按钮 */}
          <Space size={8} style={{ minWidth: 200, justifyContent: 'flex-end' }}>
            <Button
              type="text"
              icon={<BookOutlined />}
              onClick={() => setDocsVisible(true)}
              style={{ fontSize: 15 }}
            >
              指南
            </Button>

            <Button
              type="text"
              icon={<FileTextOutlined />}
              onClick={loadSample}
              style={{ fontSize: 15 }}
            >
              示例
            </Button>

            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => setSettingsPanelVisible(!settingsPanelVisible)}
              style={{ fontSize: 15, fontWeight: settingsPanelVisible ? 600 : 400 }}
            >
              设置
            </Button>
          </Space>
        </Header>

        {/* 主内容区 */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* 编辑器和预览区 */}
          <Content
            style={{
              width: settingsPanelVisible ? 'calc(100% - 300px)' : '100%',
              transition: 'width 0.3s ease',
              display: 'flex',
              padding: 16,
              gap: 16,
              height: 'calc(100vh - 60px - 48px)',
              overflow: 'hidden',
            }}
          >
            {/* 编辑器 */}
            <div
              style={{
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e8e8e8',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#fafafa',
                }}
              >
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
                  编辑器
                </Text>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <MarkdownEditor
                  ref={editorRef}
                  value={markdownContent}
                  onChange={setMarkdownContent}
                  placeholder="在此输入 Markdown 内容..."
                />
              </div>
            </div>

            {/* 预览区 */}
            <div
              style={{
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e8e8e8',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fafafa',
                }}
              >
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
                  预览
                </Text>
                {outputFormat === 'xiaohongshu' ? (
                  <Space size={8}>
                    <Dropdown
                      menu={{
                        items: xiaohongshuSizeOptions.map(opt => ({
                          key: opt.value,
                          label: (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{opt.label}</span>
                              <span style={{ color: '#999', fontSize: 12 }}>({opt.description})</span>
                            </div>
                          ),
                          onClick: () => setXiaohongshuSize(opt.value),
                        })),
                      }}
                      placement="bottomRight"
                    >
                      <Button size="middle" style={{ borderRadius: 10 }}>
                        {xiaohongshuSizeOptions.find(opt => opt.value === xiaohongshuSize)?.label}
                      </Button>
                    </Dropdown>
                    <Dropdown
                      menu={{
                        items: xiaohongshuSplitOptions.map(opt => ({
                          key: opt.value,
                          label: (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span>{opt.label}</span>
                              <span style={{ color: '#999', fontSize: 11 }}>{opt.description}</span>
                            </div>
                          ),
                          onClick: () => setXiaohongshuSplitMode(opt.value),
                        })),
                      }}
                      placement="bottomRight"
                    >
                      <Button size="middle" style={{ borderRadius: 10 }}>
                        {xiaohongshuSplitOptions.find(opt => opt.value === xiaohongshuSplitMode)?.label}
                      </Button>
                    </Dropdown>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      loading={loading}
                      onClick={handleExport}
                      size="middle"
                      style={{ borderRadius: 10 }}
                    >
                      导出图片
                    </Button>
                  </Space>
                ) : outputFormat === 'general' ? (
                  <Dropdown
                    menu={{
                      items: generalExportOptions.map(opt => ({
                        key: opt.key,
                        label: (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {opt.icon}
                            <span>{opt.label}</span>
                          </div>
                        ),
                        onClick: () => handleGeneralExport(opt.key as 'image' | 'pdf' | 'copyHtml' | 'downloadHtml'),
                      })),
                    }}
                    placement="bottomRight"
                  >
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      loading={loading}
                      size="middle"
                      style={{ borderRadius: 10 }}
                    >
                      导出
                    </Button>
                  </Dropdown>
                ) : outputFormat === 'email' ? (
                  <Button
                    type="primary"
                    icon={<CopyOutlined />}
                    loading={loading}
                    onClick={handleExport}
                    size="middle"
                    style={{ borderRadius: 10 }}
                  >
                    复制邮件HTML
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={outputFormat === 'wechat' ? <CopyOutlined /> : <DownloadOutlined />}
                    loading={loading}
                    onClick={handleExport}
                    size="middle"
                    style={{ borderRadius: 10 }}
                  >
                    {outputFormat === 'wechat' ? '复制' : '导出PDF'}
                  </Button>
                )}
              </div>

              <div
                ref={(el) => {
                  previewScrollRef.current = el;
                  previewRef.current = el;
                }}
                style={{
                  flex: 1,
                  overflow: 'auto',
                  background: '#fafafa',
                }}
              >
                <Preview
                  markdown={markdownContent}
                  template={currentTemplate || getTemplatesByFormat(outputFormat)[0]}
                  fontSize={settings.fontSize}
                  backgroundColor={settings.backgroundColor}
                  margin={settings.margin}
                  fixedSize={outputFormat === 'xiaohongshu' ? xiaohongshuPreviewSize : undefined}
                  splitMode={outputFormat === 'xiaohongshu' ? xiaohongshuSplitMode : undefined}
                />
              </div>
            </div>
          </Content>

          {/* 设置面板 */}
          {settingsPanelVisible && (
            <div
              style={{
                width: 300,
                height: 'calc(100vh - 60px - 48px - 32px)',
                margin: '16px 16px 16px 0',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #e8e8e8',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fafafa',
                }}
              >
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
                  设置
                </Text>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={() => setSettingsPanelVisible(false)}
                  size="small"
                />
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
                <div style={{ marginBottom: 24 }}>
                  <TemplateSelector
                    format={outputFormat}
                    selectedTemplateId={selectedTemplateId}
                    onFormatChange={handleFormatChange}
                    onTemplateChange={handleTemplateChange}
                  />
                </div>
                <SettingsPanel settings={settings} onSettingsChange={setSettings} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: 48,
            background: '#fff',
            borderTop: '1px solid #e8e8e8',
          }}
        >
          {/* 左侧：历史记录按钮 + 统计信息 */}
          <Space size={16}>
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => setHistoryVisible(true)}
              style={{ fontSize: 14 }}
            >
              历史 ({history.length}/10)
            </Button>
            <Tooltip title={`字符: ${textStats.chars} (含空格) / ${textStats.charsNoSpaces} (不含空格)\n行数: ${textStats.lines}\n段落数: ${textStats.paragraphs}`}>
              <Text type="secondary" style={{ fontSize: 13, cursor: 'pointer' }}>
                {textStats.words} 字 · {textStats.lines} 行
              </Text>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              约 {textStats.readTime} 分钟
            </Text>
          </Space>

          {/* 右侧：版权信息 + GitHub */}
          <Space size={16}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              MD2Anything © {new Date().getFullYear()}
            </Text>
            <Button
              type="text"
              icon={<GithubOutlined />}
              href="https://github.com/Freakz3z/MD2Anything"
              target="_blank"
              style={{ fontSize: 16, color: '#666' }}
            />
          </Space>
        </Footer>

        {/* 历史记录弹窗 */}
        <Modal
          title="历史记录"
          open={historyVisible}
          onCancel={() => setHistoryVisible(false)}
          footer={null}
          width={580}
          styles={{ body: { padding: 20 } }}
        >
          <HistoryPanel
            history={history}
            onLoad={handleLoadFromHistory}
            onDelete={deleteFromHistory}
            onClear={clearHistory}
          />
        </Modal>

        {/* 文档弹窗 */}
        <DocsModal open={docsVisible} onClose={() => setDocsVisible(false)} />
      </Layout>
    </ConfigProvider>
  );
};

export default App;
