import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { OutputFormat, HistoryRecord, Settings } from '../types';

const STORAGE_KEY = 'md2everything-storage';
const MAX_HISTORY = 10; // 最多保存10条记录
const AUTO_SAVE_INTERVAL = 60000; // 1分钟自动保存

interface StoreState {
  // 输入
  markdownContent: string;

  // 输出
  outputFormat: OutputFormat;
  selectedTemplateId: string;

  // 设置
  settings: Settings;
  settingsPanelVisible: boolean;

  // 历史记录
  history: HistoryRecord[];
  lastAutoSave: number;

  // 操作
  setMarkdownContent: (content: string) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setSelectedTemplateId: (id: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
  setSettingsPanelVisible: (visible: boolean) => void;

  // 历史记录操作
  addToHistory: (record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  autoSave: () => void;
  deleteFromHistory: (id: string) => void;
  clearHistory: () => void;
  loadFromHistory: (id: string) => void;
}

const defaultSettings: Settings = {
  fontSize: 15,
  backgroundColor: 'transparent',
  margin: 24,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // 初始状态
      markdownContent: '',
      outputFormat: 'wechat' as OutputFormat,
      selectedTemplateId: 'wechat-default',
      settings: defaultSettings,
      settingsPanelVisible: false,
      history: [],
      lastAutoSave: 0,

      // 设置Markdown内容
      setMarkdownContent: (content: string) => {
        set({ markdownContent: content });
      },

      // 设置输出格式
      setOutputFormat: (format: OutputFormat) => {
        set({ outputFormat: format });
      },

      // 设置选中的模板
      setSelectedTemplateId: (id: string) => {
        set({ selectedTemplateId: id });
      },

      // 设置设置
      setSettings: (newSettings: Partial<Settings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // 设置设置面板可见性
      setSettingsPanelVisible: (visible: boolean) => {
        set({ settingsPanelVisible: visible });
      },

      // 添加到历史记录（手动）
      addToHistory: (record: Omit<HistoryRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newRecord: HistoryRecord = {
          ...record,
          id: uuidv4(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          history: [newRecord, ...state.history].slice(0, MAX_HISTORY),
        }));
      },

      // 自动保存（每1分钟调用一次）
      autoSave: () => {
        const state = get();
        const now = Date.now();

        // 如果内容为空或距离上次保存不足1分钟，则不保存
        if (!state.markdownContent.trim()) return;
        if (now - state.lastAutoSave < AUTO_SAVE_INTERVAL) return;

        // 创建自动保存记录
        const title = state.markdownContent.split('\n')[0].replace(/^#+\s*/, '') || '自动保存';

        // 检查是否已存在相同的自动保存
        const existingAutoSave = state.history.find(
          (h) => h.title.startsWith('[自动]') && h.content === state.markdownContent
        );

        if (existingAutoSave) {
          // 更新现有记录的时间
          set((s) => ({
            history: s.history.map((h) =>
              h.id === existingAutoSave.id
                ? { ...h, updatedAt: now }
                : h
            ),
            lastAutoSave: now,
          }));
        } else {
          // 创建新的自动保存记录
          const newRecord: HistoryRecord = {
            id: uuidv4(),
            title: `[自动] ${title}`,
            content: state.markdownContent,
            format: state.outputFormat,
            templateId: state.selectedTemplateId,
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({
            history: [newRecord, ...s.history].slice(0, MAX_HISTORY),
            lastAutoSave: now,
          }));
        }
      },

      // 删除历史记录
      deleteFromHistory: (id: string) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }));
      },

      // 清空历史记录
      clearHistory: () => {
        set({ history: [] });
      },

      // 从历史记录加载
      loadFromHistory: (id: string) => {
        const record = get().history.find((item) => item.id === id);
        if (record) {
          set({
            markdownContent: record.content,
            outputFormat: record.format,
            selectedTemplateId: record.templateId,
          });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        markdownContent: state.markdownContent,
        history: state.history,
        outputFormat: state.outputFormat,
        selectedTemplateId: state.selectedTemplateId,
        settings: state.settings,
        lastAutoSave: state.lastAutoSave,
      }),
    }
  )
);

// 导出常量
export { MAX_HISTORY, AUTO_SAVE_INTERVAL };
