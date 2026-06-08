import type { Template } from '../src/types';
import { getAllTemplates } from '../src/templates';

const supportedFormats = new Set(['general', 'wechat', 'email']);

export const templates: Template[] = getAllTemplates().filter((template) =>
  supportedFormats.has(template.format)
);

// 根据 ID 获取模板
export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

// 根据格式获取模板
export function getTemplatesByFormat(format: string): Template[] {
  return templates.filter((t) => t.format === format);
}
