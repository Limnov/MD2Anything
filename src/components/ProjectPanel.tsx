import React from 'react';
import { Button, Empty, Space, Tooltip, Typography } from 'antd';
import {
  EditOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { Project, ProjectMaterial } from '../types';

const { Text, Paragraph } = Typography;

interface ProjectPanelProps {
  projects: Project[];
  projectMaterials: ProjectMaterial[];
  activeProject: Project | null;
  activeMaterial: ProjectMaterial | null;
  materials: ProjectMaterial[];
  loading: boolean;
  onSelectProject: (projectId: string) => void;
  onSelectMaterial: (materialId: string) => void;
  onCreateProject: () => void;
  onEditProject: () => void;
  onCreateEmptyMaterial: () => void;
  onEditMaterial: () => void;
  onUpload: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({
  projects,
  projectMaterials,
  activeProject,
  activeMaterial,
  materials,
  loading,
  onSelectProject,
  onSelectMaterial,
  onCreateProject,
  onEditProject,
  onCreateEmptyMaterial,
  onEditMaterial,
  onUpload,
}) => {
  return (
    <div className="project-panel">
      <div className="project-panel__current">
        <Text strong className="project-panel__current-title">
          {activeProject?.name || '未选择项目'}
        </Text>
        <Paragraph
          type="secondary"
          style={{ margin: '6px 0 0', fontSize: 12 }}
          ellipsis={{ rows: 2, tooltip: activeProject?.description }}
        >
          {activeProject?.description || '当前项目用于管理资料、编辑内容与版本。'}
        </Paragraph>
      </div>

      <div className="project-panel__section">
        <div className="project-panel__section-header">
          <Text strong style={{ color: '#262626' }}>项目</Text>
          <Space size={8} className="project-panel__actions">
            <Tooltip title="新建项目">
              <Button size="small" type="default" icon={<FolderAddOutlined />} onClick={onCreateProject} />
            </Tooltip>
          </Space>
        </div>
        <div className="project-panel__list">
          {projects.map((project) => {
            const isActive = activeProject?.id === project.id;
            const count = materials.filter((material) => material.projectId === project.id).length;

            return (
              <button
                key={project.id}
                type="button"
                className={`project-panel__item project-panel__item--project${isActive ? ' is-active' : ''}`}
                onClick={() => onSelectProject(project.id)}
              >
                <span className="project-panel__item-rail" />
                <span className="project-panel__item-main">
                  <span className="project-panel__item-title-row">
                    <Text strong className="project-panel__item-title">
                      {project.name}
                    </Text>
                    <span className="project-panel__item-controls">
                      <span className="project-panel__meta-pill">{count}</span>
                      {isActive ? (
                        <Tooltip title="编辑项目">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            className="project-panel__icon-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditProject();
                            }}
                          />
                        </Tooltip>
                      ) : null}
                    </span>
                  </span>
                  {project.description ? (
                    <Text type="secondary" className="project-panel__item-meta" ellipsis>
                      {project.description}
                    </Text>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="project-panel__section project-panel__section--materials">
        <div className="project-panel__section-header">
          <Text strong style={{ color: '#262626' }}>资料</Text>
          <Space size={8} className="project-panel__actions">
            <Tooltip title="新建空白资料">
              <Button size="small" type="default" icon={<FileAddOutlined />} onClick={onCreateEmptyMaterial} disabled={!activeProject} />
            </Tooltip>
            <Tooltip title="导入资料">
              <Button size="small" type="default" icon={<UploadOutlined />} onClick={onUpload} loading={loading} />
            </Tooltip>
          </Space>
        </div>

        <div className="project-panel__list project-panel__list--materials">
          {projectMaterials.length > 0 ? projectMaterials.map((material) => {
            const isActive = activeMaterial?.id === material.id;

            return (
              <button
                key={material.id}
                type="button"
                className={`project-panel__item project-panel__item--material${isActive ? ' is-active' : ''}`}
                onClick={() => onSelectMaterial(material.id)}
              >
                <span className="project-panel__item-rail" />
                <span className="project-panel__item-main">
                  <span className="project-panel__item-title-row">
                    <Text className="project-panel__item-title project-panel__item-title--material" strong>
                      {material.title}
                    </Text>
                    <span className="project-panel__item-controls">
                      <span className="project-panel__meta-pill project-panel__meta-pill--subtle">
                        {material.sourceFileType.toUpperCase()}
                      </span>
                      {isActive ? (
                        <Tooltip title="编辑资料">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            className="project-panel__icon-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEditMaterial();
                            }}
                          />
                        </Tooltip>
                      ) : null}
                    </span>
                  </span>
                  <Text type="secondary" className="project-panel__item-meta">
                    {material.summary.wordCount} 词 · {material.versions.length} 个版本
                  </Text>
                </span>
              </button>
            );
          }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无资料" />}
        </div>
      </div>
    </div>
  );
};

export default ProjectPanel;
