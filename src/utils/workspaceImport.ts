import type { MaterialSourceType, WorkspaceImportResult } from '../types';
import { createSummaryFromMarkdown } from '../store/useStore';

const MAX_LOCAL_TEXT_SIZE = 2_500_000;

const normalizeTextToMarkdown = (text: string) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const extractMarkdownFromTextFile = async (file: File) => {
  return await file.text();
};

const getSourceFileType = (file: File): MaterialSourceType | null => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown';
  if (name.endsWith('.txt')) return 'txt';
  return null;
};

export const supportedImportExtensions = ['.md', '.markdown', '.txt'];

export const importWorkspaceFile = async (file: File): Promise<WorkspaceImportResult> => {
  const sourceFileType = getSourceFileType(file);
  if (!sourceFileType) {
    throw new Error('当前工作区仅支持导入 Markdown 和 TXT 文件');
  }

  const rawText = await extractMarkdownFromTextFile(file);

  if (!rawText.trim()) {
    throw new Error('文件内容为空');
  }

  const normalizedMarkdown = normalizeTextToMarkdown(rawText);
  if (normalizedMarkdown.length > MAX_LOCAL_TEXT_SIZE) {
    throw new Error('解析后的文本过大，已超出当前本地工作区建议容量');
  }

  return {
    sourceFileName: file.name,
    sourceFileType,
    size: file.size,
    lastModified: file.lastModified,
    rawText,
    normalizedMarkdown,
    summary: createSummaryFromMarkdown(normalizedMarkdown, file.name.replace(/\.[^.]+$/, '')),
  };
};
