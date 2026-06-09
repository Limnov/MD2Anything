import React from 'react';
import { Button, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface SidePanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  side?: 'left' | 'right';
}

const SidePanel: React.FC<SidePanelProps> = ({
  title,
  onClose,
  children,
  width = 300,
  side = 'right',
}) => {
  return (
    <div
      className={`workspace-side-panel workspace-side-panel--${side}`}
      style={{ width }}
    >
      <div className="workspace-side-panel__header">
        <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
          {title}
        </Text>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
          size="small"
        />
      </div>

      <div className="workspace-side-panel__body">
        {children}
      </div>
    </div>
  );
};

export default SidePanel;
