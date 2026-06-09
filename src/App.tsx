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
  Input,
  Popconfirm,
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
  CopyOutlined,
  AppstoreOutlined,
  MailOutlined,
  BookOutlined,
  GithubOutlined,
  ClockCircleOutlined,
  FolderAddOutlined,
  SaveOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

import MarkdownEditor from './components/MarkdownEditor';
import Preview from './components/Preview';
import HistoryPanel from './components/HistoryPanel';
import TemplateSelector from './components/TemplateSelector';
import SettingsPanel from './components/SettingsPanel';
import ProjectPanel from './components/ProjectPanel';
import SidePanel from './components/SidePanel';
import DocsModal from './components/DocsModal';
import { useStore, AUTO_SAVE_INTERVAL } from './store/useStore';
import { exportContent, xiaohongshuSizeOptions, xiaohongshuSplitOptions } from './utils/export';
import { getTemplateById, getTemplatesByFormat } from './templates';
import { getSampleByFormat } from './utils/sampleContent';
import { getTextStats } from './utils/stats';
import { importWorkspaceFile, supportedImportExtensions } from './utils/workspaceImport';
import type { OutputFormat, XiaohongshuSize, XiaohongshuSplitMode } from './types';
import type { MarkdownEditorHandle } from './components/MarkdownEditor';

import './App.css';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const formatOptions = [
  { value: 'wechat', label: '微信', icon: <WechatOutlined /> },
  { value: 'xiaohongshu', label: '小红书', icon: <PictureOutlined /> },
  { value: 'email', label: '邮件', icon: <MailOutlined /> },
  { value: 'resume', label: '简历', icon: <FileTextOutlined /> },
  { value: 'general', label: '通用', icon: <AppstoreOutlined /> },
];

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
  const [historyVisible, setHistoryVisible] = useState(false);
  const [docsVisible, setDocsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectDescription, setEditingProjectDescription] = useState('');
  const [editingMaterialTitle, setEditingMaterialTitle] = useState('');
  const [deletingProject, setDeletingProject] = useState(false);
  const [xiaohongshuSize, setXiaohongshuSize] = useState<XiaohongshuSize>('vertical');
  const [xiaohongshuSplitMode, setXiaohongshuSplitMode] = useState<XiaohongshuSplitMode>('hr');

  const {
    projects,
    materials,
    activeProject,
    activeMaterial,
    markdownContent,
    outputFormat,
    selectedTemplateId,
    settings,
    leftPanelVisible,
    rightPanelVisible,
    history,
    setMarkdownContent,
    setOutputFormat,
    setSelectedTemplateId,
    setSettings,
    setPanelVisible,
    createProject,
    renameProject,
    updateProjectDescription,
    deleteProject,
    setActiveProject,
    setActiveMaterial,
    renameMaterial,
    createEmptyMaterial,
    deleteMaterial,
    createMaterialFromImport,
    saveVersion,
    autoSave,
    deleteFromHistory,
    clearHistory,
    loadFromHistory,
  } = useStore();

  const previewRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSyncingScroll = useRef(false);

  const currentTemplate = getTemplateById(selectedTemplateId);
  const isProjectsPanelVisible = leftPanelVisible;
  const isSettingsPanelVisible = rightPanelVisible;
  const contentWidth = `calc(100% - ${isProjectsPanelVisible ? 320 : 0}px - ${isSettingsPanelVisible ? 300 : 0}px)`;
  const xiaohongshuPreviewSize = useMemo(
    () => getXiaohongshuPreviewSize(xiaohongshuSize),
    [xiaohongshuSize]
  );
  const textStats = useMemo(() => getTextStats(markdownContent), [markdownContent]);

  const projectMaterials = useMemo(
    () => materials.filter(material => material.projectId === activeProject?.id),
    [materials, activeProject?.id]
  );

  useEffect(() => {
    const templates = getTemplatesByFormat(outputFormat);
    if (templates.length > 0 && !templates.find(t => t.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [outputFormat, selectedTemplateId, setSelectedTemplateId]);

  useEffect(() => {
    const interval = setInterval(() => {
      autoSave();
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [autoSave]);

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
        activeMaterial?.title || undefined,
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
  }, [activeMaterial?.title, markdownContent, outputFormat, selectedTemplateId, settings, xiaohongshuSize, xiaohongshuSplitMode]);

  const handleGeneralExport = useCallback(async (type: 'image' | 'pdf' | 'copyHtml' | 'downloadHtml') => {
    if (!markdownContent.trim()) {
      message.warning('请先输入内容');
      return;
    }
    setLoading(true);
    try {
      let result;
      if (type === 'copyHtml') {
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
          activeMaterial?.title || undefined,
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
  }, [activeMaterial?.title, markdownContent, selectedTemplateId, settings]);

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
    message.success('已恢复所选版本');
  }, [loadFromHistory]);

  const togglePanel = useCallback((panel: 'projects' | 'settings') => {
    const nextVisible = panel === 'projects' ? !leftPanelVisible : !rightPanelVisible;
    setPanelVisible(panel, nextVisible);
  }, [leftPanelVisible, rightPanelVisible, setPanelVisible]);

  const handleCreateProject = useCallback(() => {
    createProject(newProjectName.trim() || undefined);
    setNewProjectName('');
    setCreatingProject(false);
    message.success('项目已创建');
  }, [createProject, newProjectName]);

  const handleSaveProjectEditor = useCallback(() => {
    if (!activeProject) return;
    const nextName = editingProjectName.trim();
    if (!nextName) {
      message.warning('项目名称不能为空');
      return;
    }
    renameProject(activeProject.id, nextName);
    updateProjectDescription(activeProject.id, editingProjectDescription.trim());
    setEditingProject(false);
    message.success('项目已更新');
  }, [activeProject, editingProjectDescription, editingProjectName, renameProject, updateProjectDescription]);

  const handleDeleteProject = useCallback(() => {
    if (!activeProject) return;
    deleteProject(activeProject.id);
    setDeletingProject(false);
    setEditingProject(false);
    message.success('项目已删除');
  }, [activeProject, deleteProject]);

  const handleOpenMaterialEditor = useCallback(() => {
    setEditingMaterialTitle(activeMaterial?.title || '');
    setEditingMaterial(true);
  }, [activeMaterial?.title]);

  const handleSaveMaterialEditor = useCallback(() => {
    if (!activeMaterial) return;
    const nextTitle = editingMaterialTitle.trim();
    if (!nextTitle) {
      message.warning('资料名称不能为空');
      return;
    }
    renameMaterial(activeMaterial.id, nextTitle);
    setEditingMaterial(false);
    message.success('资料名称已更新');
  }, [activeMaterial, editingMaterialTitle, renameMaterial]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCreateEmptyMaterial = useCallback(() => {
    if (!activeProject) return;
    createEmptyMaterial(activeProject.id);
    message.success('已创建空白资料');
  }, [activeProject, createEmptyMaterial]);

  const handleDeleteActiveMaterial = useCallback(() => {
    if (!activeMaterial) return;
    deleteMaterial(activeMaterial.id);
    message.success('资料已删除');
  }, [activeMaterial, deleteMaterial]);

  const handleImportFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !activeProject) return;

    const file = fileList[0];
    setLoading(true);
    try {
      const result = await importWorkspaceFile(file);
      createMaterialFromImport(activeProject.id, result);
      message.success(`已导入 ${file.name}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '文件导入失败');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [activeProject, createMaterialFromImport]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240 }}>
            <img
              src="/logo.jpg"
              alt="Logo"
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <Text strong style={{ fontSize: 17, color: '#1f1f1f', lineHeight: 1.2 }}>
                MD2Anything Workspace
              </Text>
              <Text style={{ fontSize: 11, color: '#999', lineHeight: 1.2 }}>
                本地项目工作区 MVP
              </Text>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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

          <Space size={8} style={{ minWidth: 320, justifyContent: 'flex-end' }}>
            <Button
              type="text"
              icon={<FolderAddOutlined />}
              onClick={() => togglePanel('projects')}
              className={`workspace-header-action${isProjectsPanelVisible ? ' workspace-header-action--active' : ''}`}
              style={{ fontSize: 15 }}
            >
              项目
            </Button>
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => togglePanel('settings')}
              className={`workspace-header-action${isSettingsPanelVisible ? ' workspace-header-action--active' : ''}`}
              style={{ fontSize: 15 }}
            >
              设置
            </Button>
          </Space>
        </Header>

        <Layout style={{ background: '#f5f6f8' }}>
          <Layout style={{ background: '#f5f6f8' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {isProjectsPanelVisible && (
                <SidePanel title="项目" onClose={() => setPanelVisible('projects', false)} width={320} side="left">
                  <ProjectPanel
                    projects={projects}
                    projectMaterials={projectMaterials}
                    activeProject={activeProject}
                    activeMaterial={activeMaterial}
                    materials={materials}
                    loading={loading}
                    onSelectProject={setActiveProject}
                    onSelectMaterial={setActiveMaterial}
                    onCreateProject={() => setCreatingProject(true)}
                    onEditProject={() => {
                      setEditingProjectName(activeProject?.name || '');
                      setEditingProjectDescription(activeProject?.description || '');
                      setEditingProject(true);
                    }}
                    onCreateEmptyMaterial={handleCreateEmptyMaterial}
                    onEditMaterial={handleOpenMaterialEditor}
                    onUpload={handleUploadClick}
                  />
                </SidePanel>
              )}

              <Content
                style={{
                  width: contentWidth,
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  padding: 16,
                  gap: 16,
                  height: 'calc(100vh - 60px - 48px)',
                  overflow: 'hidden',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={supportedImportExtensions.join(',')}
                  style={{ display: 'none' }}
                  onChange={(event) => void handleImportFiles(event.target.files)}
                />
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
                    <div>
                      <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
                        编辑器
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {activeProject?.name || '未选择项目'} / {activeMaterial?.title || '未选择资料'}
                        </Text>
                      </div>
                    </div>
                    <Space size={8}>
                      <Button type="text" icon={<FileTextOutlined />} onClick={loadSample}>
                        示例
                      </Button>
                    </Space>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <MarkdownEditor
                      ref={editorRef}
                      value={markdownContent}
                      onChange={setMarkdownContent}
                      placeholder="在此输入 Markdown 内容，或先从左侧项目面板导入文件..."
                    />
                  </div>
                </div>

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
                        <Button type="primary" icon={<DownloadOutlined />} loading={loading} onClick={handleExport} size="middle" style={{ borderRadius: 10 }}>
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
                        <Button type="primary" icon={<DownloadOutlined />} loading={loading} size="middle" style={{ borderRadius: 10 }}>
                          导出
                        </Button>
                      </Dropdown>
                    ) : outputFormat === 'email' ? (
                      <Button type="primary" icon={<CopyOutlined />} loading={loading} onClick={handleExport} size="middle" style={{ borderRadius: 10 }}>
                        复制邮件HTML
                      </Button>
                    ) : (
                      <Button type="primary" icon={outputFormat === 'wechat' ? <CopyOutlined /> : <DownloadOutlined />} loading={loading} onClick={handleExport} size="middle" style={{ borderRadius: 10 }}>
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

              {isSettingsPanelVisible && (
                <SidePanel title="设置" onClose={() => setPanelVisible('settings', false)} side="right">
                  <div style={{ marginBottom: 24 }}>
                    <TemplateSelector
                      format={outputFormat}
                      selectedTemplateId={selectedTemplateId}
                      onFormatChange={handleFormatChange}
                      onTemplateChange={handleTemplateChange}
                    />
                  </div>
                  <SettingsPanel settings={settings} onSettingsChange={setSettings} />
                </SidePanel>
              )}
            </div>

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
              <Space size={16}>
                <Button
                  type="text"
                  icon={<HistoryOutlined />}
                  onClick={() => setHistoryVisible(true)}
                  style={{ fontSize: 14 }}
                >
                  版本 ({history.length})
                </Button>
                <Button
                  type="text"
                  icon={<SaveOutlined />}
                  onClick={() => {
                    saveVersion();
                    message.success('当前版本已保存');
                  }}
                  style={{ fontSize: 14 }}
                >
                  保存版本
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

              <Space size={16}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  MD2Anything © {new Date().getFullYear()}
                </Text>
                <Button
                  type="text"
                  icon={<GithubOutlined />}
                  href="https://github.com/Limnov/MD2Anything"
                  target="_blank"
                  style={{ fontSize: 16, color: '#666' }}
                />
                <Button
                  type="text"
                  icon={<BookOutlined />}
                  onClick={() => setDocsVisible(true)}
                  style={{ fontSize: 14 }}
                >
                  关于
                </Button>
              </Space>
            </Footer>
          </Layout>
        </Layout>

        <Modal
          title="版本记录"
          open={historyVisible}
          onCancel={() => setHistoryVisible(false)}
          footer={null}
          width={620}
          styles={{ body: { padding: 20 } }}
        >
          <HistoryPanel
            history={history}
            onLoad={handleLoadFromHistory}
            onDelete={deleteFromHistory}
            onClear={clearHistory}
          />
        </Modal>

        <Modal
          title="新建项目"
          open={creatingProject}
          onCancel={() => {
            setCreatingProject(false);
            setNewProjectName('');
          }}
          onOk={handleCreateProject}
          okText="创建"
          cancelText="取消"
        >
          <Input
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder="输入项目名称"
            autoFocus
          />
        </Modal>

        <Modal
          title="编辑项目"
          open={editingProject}
          onCancel={() => {
            setEditingProject(false);
            setDeletingProject(false);
          }}
          onOk={handleSaveProjectEditor}
          okText="保存"
          cancelText="取消"
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Input
              value={editingProjectName}
              onChange={(event) => setEditingProjectName(event.target.value)}
              placeholder="项目名称"
            />
            <Input.TextArea
              value={editingProjectDescription}
              onChange={(event) => setEditingProjectDescription(event.target.value)}
              placeholder="项目描述（可选）"
              rows={4}
            />
            <Button danger icon={<DeleteOutlined />} onClick={() => setDeletingProject(true)} disabled={!activeProject}>
              删除当前项目
            </Button>
          </Space>
        </Modal>

        <Modal
          title="确认删除项目"
          open={deletingProject}
          onCancel={() => setDeletingProject(false)}
          footer={null}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Text>删除项目后，该项目下所有资料与版本都会被移除。</Text>
            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button onClick={() => setDeletingProject(false)}>取消</Button>
              <Button danger onClick={handleDeleteProject}>确认删除</Button>
            </Space>
          </Space>
        </Modal>

        <Modal
          title="编辑资料"
          open={editingMaterial}
          onCancel={() => setEditingMaterial(false)}
          onOk={handleSaveMaterialEditor}
          okText="保存"
          cancelText="取消"
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Input
              value={editingMaterialTitle}
              onChange={(event) => setEditingMaterialTitle(event.target.value)}
              placeholder="资料名称"
            />
            <Popconfirm
              title="确定要删除当前资料吗？"
              description="删除后无法恢复，且会移除该资料下所有版本。"
              onConfirm={handleDeleteActiveMaterial}
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} disabled={!activeMaterial}>
                删除当前资料
              </Button>
            </Popconfirm>
          </Space>
        </Modal>

        <DocsModal open={docsVisible} onClose={() => setDocsVisible(false)} />
      </Layout>
    </ConfigProvider>
  );
};

export default App;
