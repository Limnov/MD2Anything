import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getTemplatesByFormat } from '../templates';
import { getSampleByFormat } from '../utils/sampleContent';
import type {
  HistoryRecord,
  MaterialVersion,
  OutputFormat,
  Project,
  ProjectMaterial,
  Settings,
  WorkspaceImportResult,
} from '../types';

const STORAGE_KEY = 'md2everything-storage';
const STORE_VERSION = 3;
const MAX_VERSIONS_PER_MATERIAL = 20;
const AUTO_SAVE_INTERVAL = 60000;

const defaultSettings: Settings = {
  fontSize: 15,
  backgroundColor: 'transparent',
  margin: 24,
};

type RightPanelKey = 'projects' | 'settings';

interface LegacyStoreState {
  markdownContent?: string;
  outputFormat?: OutputFormat;
  selectedTemplateId?: string;
  settings?: Settings;
  history?: HistoryRecord[];
  settingsPanelVisible?: boolean;
  lastAutoSave?: number;
}

interface PersistedWorkspaceState {
  projects: Project[];
  materials: ProjectMaterial[];
  activeProjectId: string | null;
  activeMaterialId: string | null;
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
}

interface StoreState extends PersistedWorkspaceState {
  activeProject: Project | null;
  activeMaterial: ProjectMaterial | null;
  markdownContent: string;
  outputFormat: OutputFormat;
  selectedTemplateId: string;
  settings: Settings;
  history: HistoryRecord[];
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;

  setPanelVisible: (panel: RightPanelKey, visible: boolean) => void;
  createProject: (name?: string, description?: string) => void;
  renameProject: (projectId: string, name: string) => void;
  updateProjectDescription: (projectId: string, description: string) => void;
  deleteProject: (projectId: string) => void;
  setActiveProject: (projectId: string) => void;
  setActiveMaterial: (materialId: string) => void;
  renameMaterial: (materialId: string, title: string) => void;
  createEmptyMaterial: (projectId: string, title?: string) => void;
  deleteMaterial: (materialId: string) => void;
  createMaterialFromImport: (projectId: string, result: WorkspaceImportResult) => void;
  saveVersion: (name?: string, source?: MaterialVersion['source']) => void;
  autoSave: () => void;
  deleteFromHistory: (id: string) => void;
  clearHistory: () => void;
  loadFromHistory: (id: string) => void;
  setMarkdownContent: (content: string) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setSelectedTemplateId: (id: string) => void;
  setSettings: (settings: Partial<Settings>) => void;
}

const createVersionRecord = (
  name: string,
  markdownContent: string,
  outputFormat: OutputFormat,
  selectedTemplateId: string,
  settings: Settings,
  source: MaterialVersion['source'],
  timestamp: number = Date.now()
): MaterialVersion => ({
  id: uuidv4(),
  name,
  markdownContent,
  outputFormat,
  selectedTemplateId,
  settings: { ...settings },
  source,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const createSummaryFromMarkdown = (markdown: string, fallbackTitle: string) => {
  const lines = markdown.split(/\r?\n/).map(line => line.trim());
  const title = lines.find(line => /^#\s+/.test(line))?.replace(/^#\s+/, '') || fallbackTitle;
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map(block => block.replace(/^#+\s+/gm, '').replace(/[*_`>#-]/g, '').trim())
    .filter(Boolean);
  const brief = paragraphs[0] || '暂无摘要';
  const bullets = lines
    .filter(line => /^#{2,3}\s+/.test(line))
    .map(line => line.replace(/^#{2,3}\s+/, ''))
    .slice(0, 5);
  const words = markdown.match(/[一-龥]|[A-Za-z0-9_-]+/g) || [];
  const keywords = Array.from(
    new Set(
      words
        .map(word => word.toLowerCase())
        .filter(word => word.length >= 2 && !/^\d+$/.test(word))
    )
  ).slice(0, 8);

  return {
    title,
    brief,
    bullets,
    keywords,
    wordCount: words.length,
    sourceExcerpt: brief.slice(0, 160),
  };
};

const convertVersionToHistory = (version: MaterialVersion): HistoryRecord => ({
  id: version.id,
  title: version.name,
  content: version.markdownContent,
  format: version.outputFormat,
  templateId: version.selectedTemplateId,
  createdAt: version.createdAt,
  updatedAt: version.updatedAt,
});

const createBlankMaterial = (projectId: string, title = '未命名资料', now: number = Date.now()): ProjectMaterial => {
  const outputFormat: OutputFormat = 'wechat';
  const selectedTemplateId = getTemplatesByFormat(outputFormat)[0]?.id || 'wechat-tech';
  const markdownContent = getSampleByFormat(outputFormat);
  const version = createVersionRecord('初始版本', markdownContent, outputFormat, selectedTemplateId, defaultSettings, 'initial-import', now);

  return {
    id: uuidv4(),
    projectId,
    title,
    sourceFileName: 'sample.md',
    sourceFileType: 'markdown',
    sourceFileMeta: {
      size: markdownContent.length,
      lastModified: now,
    },
    rawText: markdownContent,
    normalizedMarkdown: markdownContent,
    summary: createSummaryFromMarkdown(markdownContent, title),
    parseStatus: 'ready',
    versions: [version],
    currentVersionId: version.id,
    createdAt: now,
    updatedAt: now,
    lastAutoSave: 0,
  };
};

const createWorkspaceData = (): PersistedWorkspaceState => {
  const now = Date.now();
  const projectId = uuidv4();
  const material = createBlankMaterial(projectId, '示例资料', now);
  const project: Project = {
    id: projectId,
    name: '默认项目',
    description: '从示例内容开始的本地工作区',
    materialIds: [material.id],
    createdAt: now,
    updatedAt: now,
  };

  return {
    projects: [project],
    materials: [material],
    activeProjectId: project.id,
    activeMaterialId: material.id,
    leftPanelVisible: true,
    rightPanelVisible: false,
  };
};

const buildDerivedState = (workspace: PersistedWorkspaceState) => {
  const activeProject = workspace.projects.find(project => project.id === workspace.activeProjectId) || null;
  const activeMaterial = workspace.materials.find(material => material.id === workspace.activeMaterialId) || null;
  const activeVersion = activeMaterial?.versions.find(version => version.id === activeMaterial.currentVersionId)
    || activeMaterial?.versions[0]
    || null;

  return {
    ...workspace,
    activeProject,
    activeMaterial,
    markdownContent: activeVersion?.markdownContent || '',
    outputFormat: activeVersion?.outputFormat || 'wechat',
    selectedTemplateId: activeVersion?.selectedTemplateId || getTemplatesByFormat('wechat')[0]?.id || 'wechat-tech',
    settings: activeVersion?.settings || defaultSettings,
    history: activeMaterial?.versions.map(convertVersionToHistory).sort((a, b) => b.updatedAt - a.updatedAt) || [],
  };
};

const createWorkspaceFromLegacyState = (legacy: LegacyStoreState): PersistedWorkspaceState => {
  const now = Date.now();
  const projectId = uuidv4();
  const outputFormat = legacy.outputFormat || 'wechat';
  const selectedTemplateId = legacy.selectedTemplateId || getTemplatesByFormat(outputFormat)[0]?.id || 'wechat-tech';
  const settings = legacy.settings || defaultSettings;
  const markdownContent = legacy.markdownContent || getSampleByFormat(outputFormat);

  const initialVersion = createVersionRecord('迁移内容', markdownContent, outputFormat, selectedTemplateId, settings, 'migrated', now);
  const migratedHistory = (legacy.history || []).map((item) => createVersionRecord(
    item.title || '历史版本',
    item.content,
    item.format,
    item.templateId,
    settings,
    'migrated',
    item.updatedAt || now
  ));

  const versions = [initialVersion, ...migratedHistory]
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(-MAX_VERSIONS_PER_MATERIAL);

  const materialId = uuidv4();
  const material: ProjectMaterial = {
    id: materialId,
    projectId,
    title: createSummaryFromMarkdown(markdownContent, '迁移资料').title,
    sourceFileName: 'migrated.md',
    sourceFileType: 'markdown',
    sourceFileMeta: {
      size: markdownContent.length,
      lastModified: now,
    },
    rawText: markdownContent,
    normalizedMarkdown: markdownContent,
    summary: createSummaryFromMarkdown(markdownContent, '迁移资料'),
    parseStatus: 'ready',
    versions,
    currentVersionId: initialVersion.id,
    createdAt: now,
    updatedAt: now,
    lastAutoSave: legacy.lastAutoSave || 0,
  };

  return {
    projects: [{
      id: projectId,
      name: '迁移项目',
      description: '从旧版单文档工作区自动迁移',
      materialIds: [materialId],
      createdAt: now,
      updatedAt: now,
    }],
    materials: [material],
    activeProjectId: projectId,
    activeMaterialId: materialId,
    leftPanelVisible: true,
    rightPanelVisible: legacy.settingsPanelVisible || false,
  };
};

const mutateActiveMaterial = (
  workspace: PersistedWorkspaceState,
  updater: (material: ProjectMaterial) => ProjectMaterial
): PersistedWorkspaceState => ({
  ...workspace,
  materials: workspace.materials.map(material =>
    material.id === workspace.activeMaterialId ? updater(material) : material
  ),
});

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...buildDerivedState(createWorkspaceData()),

      setPanelVisible: (panel, visible) => {
        set(state => buildDerivedState({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: panel === 'projects' ? visible : state.leftPanelVisible,
          rightPanelVisible: panel === 'settings' ? visible : state.rightPanelVisible,
        }));
      },

      createProject: (name = '新项目', description) => {
        const now = Date.now();
        const projectId = uuidv4();
        const material = createBlankMaterial(projectId, '空白资料', now);
        const workspace: PersistedWorkspaceState = {
          projects: [{
            id: projectId,
            name,
            description,
            materialIds: [material.id],
            createdAt: now,
            updatedAt: now,
          }, ...get().projects],
          materials: [material, ...get().materials],
          activeProjectId: projectId,
          activeMaterialId: material.id,
          leftPanelVisible: get().leftPanelVisible,
          rightPanelVisible: get().rightPanelVisible,
        };
        set(buildDerivedState(workspace));
      },

      renameProject: (projectId, name) => {
        const state = get();
        const workspace: PersistedWorkspaceState = {
          projects: state.projects.map(project => project.id === projectId ? { ...project, name, updatedAt: Date.now() } : project),
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        };
        set(buildDerivedState(workspace));
      },

      updateProjectDescription: (projectId, description) => {
        const state = get();
        const workspace: PersistedWorkspaceState = {
          projects: state.projects.map(project => project.id === projectId ? { ...project, description, updatedAt: Date.now() } : project),
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        };
        set(buildDerivedState(workspace));
      },

      deleteProject: (projectId) => {
        const state = get();
        const remainingProjects = state.projects.filter(project => project.id !== projectId);
        const removedMaterialIds = new Set(state.projects.find(project => project.id === projectId)?.materialIds || []);
        const remainingMaterials = state.materials.filter(material => !removedMaterialIds.has(material.id));

        if (remainingProjects.length === 0) {
          set(buildDerivedState(createWorkspaceData()));
          return;
        }

        const nextActiveProjectId = state.activeProjectId === projectId ? remainingProjects[0].id : state.activeProjectId;
        const nextProject = remainingProjects.find(project => project.id === nextActiveProjectId) || remainingProjects[0];
        const nextActiveMaterialId = state.activeMaterialId && !removedMaterialIds.has(state.activeMaterialId)
          ? state.activeMaterialId
          : nextProject.materialIds[0] || remainingMaterials[0]?.id || null;

        set(buildDerivedState({
          projects: remainingProjects,
          materials: remainingMaterials,
          activeProjectId: nextProject.id,
          activeMaterialId: nextActiveMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }));
      },

      setActiveProject: (projectId) => {
        const state = get();
        const project = state.projects.find(item => item.id === projectId);
        if (!project) return;

        set(buildDerivedState({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: projectId,
          activeMaterialId: project.materialIds[0] || null,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }));
      },

      setActiveMaterial: (materialId) => {
        const state = get();
        const material = state.materials.find(item => item.id === materialId);
        if (!material) return;

        set(buildDerivedState({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: material.projectId,
          activeMaterialId: materialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }));
      },

      renameMaterial: (materialId, title) => {
        const state = get();
        const workspace: PersistedWorkspaceState = {
          projects: state.projects,
          materials: state.materials.map(material =>
            material.id === materialId
              ? { ...material, title, updatedAt: Date.now(), summary: { ...material.summary, title } }
              : material
          ),
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        };
        set(buildDerivedState(workspace));
      },

      createEmptyMaterial: (projectId, title = '空白资料') => {
        const state = get();
        const now = Date.now();
        const outputFormat: OutputFormat = 'wechat';
        const selectedTemplateId = getTemplatesByFormat(outputFormat)[0]?.id || 'wechat-tech';
        const markdown = `# ${title}\n\n`;
        const version = createVersionRecord('空白草稿', markdown, outputFormat, selectedTemplateId, defaultSettings, 'initial-import', now);
        const material: ProjectMaterial = {
          id: uuidv4(),
          projectId,
          title,
          sourceFileName: 'blank.md',
          sourceFileType: 'markdown',
          sourceFileMeta: { size: 0, lastModified: now },
          rawText: markdown,
          normalizedMarkdown: markdown,
          summary: createSummaryFromMarkdown(markdown, title),
          parseStatus: 'ready',
          versions: [version],
          currentVersionId: version.id,
          createdAt: now,
          updatedAt: now,
          lastAutoSave: 0,
        };

        set(buildDerivedState({
          projects: state.projects.map(project =>
            project.id === projectId
              ? { ...project, materialIds: [material.id, ...project.materialIds], updatedAt: now }
              : project
          ),
          materials: [material, ...state.materials],
          activeProjectId: projectId,
          activeMaterialId: material.id,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }));
      },

      deleteMaterial: (materialId) => {
        const state = get();
        const target = state.materials.find(item => item.id === materialId);
        if (!target) return;

        const materials = state.materials.filter(item => item.id !== materialId);
        const projects = state.projects.map(project =>
          project.id === target.projectId
            ? { ...project, materialIds: project.materialIds.filter(id => id !== materialId), updatedAt: Date.now() }
            : project
        );
        const activeProject = projects.find(project => project.id === target.projectId) || projects[0];
        const activeMaterialId = state.activeMaterialId === materialId
          ? activeProject?.materialIds[0] || materials.find(item => item.projectId === activeProject?.id)?.id || null
          : state.activeMaterialId;

        set(buildDerivedState({
          projects,
          materials,
          activeProjectId: activeProject?.id || null,
          activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }));
      },

      createMaterialFromImport: (projectId, result) => {
        const state = get();
        const now = Date.now();
        const outputFormat: OutputFormat = 'wechat';
        const selectedTemplateId = getTemplatesByFormat(outputFormat)[0]?.id || 'wechat-tech';
        const title = result.summary.title || result.sourceFileName.replace(/\.[^.]+$/, '');
        const version = createVersionRecord('初始导入', result.normalizedMarkdown, outputFormat, selectedTemplateId, defaultSettings, 'initial-import', now);
        const material: ProjectMaterial = {
          id: uuidv4(),
          projectId,
          title,
          sourceFileName: result.sourceFileName,
          sourceFileType: result.sourceFileType,
          sourceFileMeta: { size: result.size, lastModified: result.lastModified },
          rawText: result.rawText,
          normalizedMarkdown: result.normalizedMarkdown,
          summary: result.summary,
          parseStatus: 'ready',
          versions: [version],
          currentVersionId: version.id,
          createdAt: now,
          updatedAt: now,
          lastAutoSave: 0,
        };

        set(buildDerivedState({
          projects: state.projects.map(project =>
            project.id === projectId
              ? { ...project, materialIds: [material.id, ...project.materialIds], updatedAt: now }
              : project
          ),
          materials: [material, ...state.materials],
          activeProjectId: projectId,
          activeMaterialId: material.id,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }));
      },

      saveVersion: (name, source = 'manual-save') => {
        const state = get();
        if (!state.activeMaterialId || !state.activeMaterial) return;
        if (!state.markdownContent.trim()) return;

        const now = Date.now();
        const nextName = name || `${source === 'autosave' ? '自动保存' : '版本'} ${new Date(now).toLocaleString('zh-CN')}`;
        const workspace = mutateActiveMaterial({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }, (material) => {
          const duplicate = material.versions.find(version => version.markdownContent === state.markdownContent && version.source === source);
          if (duplicate) {
            return {
              ...material,
              versions: material.versions.map(version =>
                version.id === duplicate.id
                  ? {
                      ...version,
                      name: nextName,
                      markdownContent: state.markdownContent,
                      outputFormat: state.outputFormat,
                      selectedTemplateId: state.selectedTemplateId,
                      settings: { ...state.settings },
                      updatedAt: now,
                    }
                  : version
              ),
              currentVersionId: duplicate.id,
              updatedAt: now,
              lastAutoSave: source === 'autosave' ? now : material.lastAutoSave,
            };
          }

          const nextVersion = createVersionRecord(nextName, state.markdownContent, state.outputFormat, state.selectedTemplateId, state.settings, source, now);
          return {
            ...material,
            versions: [...material.versions, nextVersion].slice(-MAX_VERSIONS_PER_MATERIAL),
            currentVersionId: nextVersion.id,
            updatedAt: now,
            lastAutoSave: source === 'autosave' ? now : material.lastAutoSave,
          };
        });
        set(buildDerivedState(workspace));
      },

      autoSave: () => {
        const state = get();
        if (!state.activeMaterial || !state.markdownContent.trim()) return;
        if (Date.now() - state.activeMaterial.lastAutoSave < AUTO_SAVE_INTERVAL) return;
        get().saveVersion(undefined, 'autosave');
      },

      deleteFromHistory: (id) => {
        const state = get();
        if (!state.activeMaterialId) return;
        const workspace = mutateActiveMaterial({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }, (material) => {
          const versions = material.versions.filter(version => version.id !== id);
          if (versions.length === 0) return material;
          return {
            ...material,
            versions,
            currentVersionId: material.currentVersionId === id ? versions[versions.length - 1].id : material.currentVersionId,
            updatedAt: Date.now(),
          };
        });
        set(buildDerivedState(workspace));
      },

      clearHistory: () => {
        const state = get();
        if (!state.activeMaterialId) return;
        const workspace = mutateActiveMaterial({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }, (material) => {
          const currentVersion = material.versions.find(version => version.id === material.currentVersionId);
          if (!currentVersion) return material;
          return {
            ...material,
            versions: [{ ...currentVersion, name: '当前版本', source: 'manual-save' }],
            currentVersionId: currentVersion.id,
            updatedAt: Date.now(),
          };
        });
        set(buildDerivedState(workspace));
      },

      loadFromHistory: (id) => {
        const state = get();
        if (!state.activeMaterialId) return;
        const workspace = mutateActiveMaterial({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }, (material) => {
          const exists = material.versions.some(version => version.id === id);
          return exists ? { ...material, currentVersionId: id, updatedAt: Date.now() } : material;
        });
        set(buildDerivedState(workspace));
      },

      setMarkdownContent: (content) => {
        const state = get();
        if (!state.activeMaterialId) return;
        const workspace = mutateActiveMaterial({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }, (material) => ({
          ...material,
          versions: material.versions.map(version =>
            version.id === material.currentVersionId
              ? { ...version, markdownContent: content, updatedAt: Date.now() }
              : version
          ),
          updatedAt: Date.now(),
        }));
        set(buildDerivedState(workspace));
      },

      setOutputFormat: (format) => {
        const state = get();
        if (!state.activeMaterialId) return;
        const nextTemplateId = getTemplatesByFormat(format)[0]?.id || state.selectedTemplateId;
        const workspace = mutateActiveMaterial({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }, (material) => ({
          ...material,
          versions: material.versions.map(version =>
            version.id === material.currentVersionId
              ? { ...version, outputFormat: format, selectedTemplateId: nextTemplateId, updatedAt: Date.now() }
              : version
          ),
          updatedAt: Date.now(),
        }));
        set(buildDerivedState(workspace));
      },

      setSelectedTemplateId: (id) => {
        const state = get();
        if (!state.activeMaterialId) return;
        const workspace = mutateActiveMaterial({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }, (material) => ({
          ...material,
          versions: material.versions.map(version =>
            version.id === material.currentVersionId
              ? { ...version, selectedTemplateId: id, updatedAt: Date.now() }
              : version
          ),
          updatedAt: Date.now(),
        }));
        set(buildDerivedState(workspace));
      },

      setSettings: (newSettings) => {
        const state = get();
        if (!state.activeMaterialId) return;
        const workspace = mutateActiveMaterial({
          projects: state.projects,
          materials: state.materials,
          activeProjectId: state.activeProjectId,
          activeMaterialId: state.activeMaterialId,
          leftPanelVisible: state.leftPanelVisible,
          rightPanelVisible: state.rightPanelVisible,
        }, (material) => ({
          ...material,
          versions: material.versions.map(version =>
            version.id === material.currentVersionId
              ? { ...version, settings: { ...version.settings, ...newSettings }, updatedAt: Date.now() }
              : version
          ),
          updatedAt: Date.now(),
        }));
        set(buildDerivedState(workspace));
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      partialize: (state) => ({
        projects: state.projects,
        materials: state.materials,
        activeProjectId: state.activeProjectId,
        activeMaterialId: state.activeMaterialId,
        leftPanelVisible: state.leftPanelVisible,
        rightPanelVisible: state.rightPanelVisible,
      }),
      migrate: (persistedState, version) => {
        if (!persistedState) return createWorkspaceData();
        if (version < 3) return createWorkspaceFromLegacyState(persistedState as LegacyStoreState);
        return persistedState as PersistedWorkspaceState;
      },
    }
  )
);

export { AUTO_SAVE_INTERVAL, MAX_VERSIONS_PER_MATERIAL, createSummaryFromMarkdown };
