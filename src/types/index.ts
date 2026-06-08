// 输出格式类型
export type OutputFormat =
  | 'wechat'      // 微信公众号
  | 'xiaohongshu' // 小红书
  | 'email'       // 邮件
  | 'resume'      // 简历
  | 'general';    // 通用（图片/PDF/HTML）

// 小红书图片尺寸预设
export type XiaohongshuSize = 'vertical' | 'square' | 'long';

// 小红书分割模式
export type XiaohongshuSplitMode = 'hr' | 'auto' | 'none';

export interface XiaohongshuSizeOption {
  value: XiaohongshuSize;
  label: string;
  width: number;
  height: number | 'auto';
  description: string;
}

// 主题风格（包含主题色）
export interface ThemeStyleOption {
  id: string;
  name: string;
  primaryColor: string;
  description: string;
}

// 设置类型
export interface Settings {
  fontSize: number; // px值
  backgroundColor: string;
  margin: number; // 边距 px值
}

// 模板类型
export interface Template {
  id: string;
  name: string;
  format: OutputFormat;
  description: string;
  preview?: string;
  themeColors: string[]; // 三个主题色
  styles: Record<string, string>;
}

// 历史记录
export interface HistoryRecord {
  id: string;
  title: string;
  content: string;
  format: OutputFormat;
  templateId: string;
  createdAt: number;
  updatedAt: number;
}

// 应用状态
export interface AppState {
  // 输入
  markdownContent: string;

  // 输出
  outputFormat: OutputFormat;
  selectedTemplateId: string;

  // 设置
  settings: Settings;

  // 历史记录
  history: HistoryRecord[];

  // UI状态
  settingsPanelVisible: boolean;

  // 操作
  setMarkdownContent: (content: string) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setSelectedTemplateId: (id: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setSettingsPanelVisible: (visible: boolean) => void;

  // 历史记录操作
  addToHistory: (record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteFromHistory: (id: string) => void;
  clearHistory: () => void;
  loadFromHistory: (id: string) => void;
}

// 导出选项
export interface ExportOptions {
  format: OutputFormat;
  filename?: string;
  quality: 'low' | 'medium' | 'high';
  includeStyles?: boolean;
}
