import React from 'react';
import { List, Button, Tag, Popconfirm, Empty, Typography, Space } from 'antd';
import {
  DeleteOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { HistoryRecord, OutputFormat } from '../types';

const { Text, Paragraph } = Typography;

interface HistoryPanelProps {
  history: HistoryRecord[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

// 格式名称映射
const formatNames: Record<OutputFormat, string> = {
  wechat: '微信公众号',
  xiaohongshu: '小红书',
  email: '邮件',
  resume: '简历',
  general: '通用',
};

// 格式颜色映射
const formatColors: Record<OutputFormat, string> = {
  wechat: 'green',
  xiaohongshu: 'magenta',
  email: 'orange',
  resume: 'blue',
  general: 'purple',
};

// 格式化时间
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onLoad,
  onDelete,
  onClear,
}) => {
  if (history.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无历史记录"
        style={{ padding: '40px 0' }}
      />
    );
  }

  return (
    <div className="history-panel">
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Popconfirm
          title="确定要清空所有历史记录吗？"
          onConfirm={onClear}
          okText="确定"
          cancelText="取消"
        >
          <Button danger size="small" icon={<DeleteOutlined />}>
            清空记录
          </Button>
        </Popconfirm>
      </div>

      <List
        dataSource={history}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                key="load"
                type="link"
                size="small"
                icon={<ExportOutlined />}
                onClick={() => onLoad(item.id)}
              >
                加载
              </Button>,
              <Popconfirm
                key="delete"
                title="确定要删除此记录吗？"
                onConfirm={() => onDelete(item.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
              title={
                <Space>
                  <Text strong>{item.title || '未命名文档'}</Text>
                  <Tag color={formatColors[item.format]}>
                    {formatNames[item.format]}
                  </Tag>
                </Space>
              }
              description={
                <div>
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 4, color: '#666', fontSize: 12 }}
                  >
                    {item.content.substring(0, 100)}
                  </Paragraph>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    最近保存 {formatTime(item.updatedAt)}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
        style={{ maxHeight: 400, overflow: 'auto' }}
      />
    </div>
  );
};

export default HistoryPanel;
