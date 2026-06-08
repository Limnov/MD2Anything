import React from 'react';
import { Modal, Typography, Divider, Collapse, Table, Tag, Space, List } from 'antd';
import {
  CheckCircleOutlined,
  CodeOutlined,
  ApiOutlined,
  SettingOutlined,
  FileTextOutlined,
  HighlightOutlined,
  FunctionOutlined,
  DeploymentUnitOutlined,
  UploadOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface DocsModalProps {
  open: boolean;
  onClose: () => void;
}

const DocsModal: React.FC<DocsModalProps> = ({ open, onClose }) => {
  const formatColumns = [
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '导出方式',
      dataIndex: 'export',
      key: 'export',
    },
  ];

  const formatData = [
    { key: '1', format: '微信', description: '适合微信公众号文章', export: '复制到剪贴板' },
    { key: '2', format: '小红书', description: '小红书图文笔记', export: '导出图片（支持多图）' },
    { key: '3', format: '邮件', description: '邮件通讯、简报', export: '复制邮件HTML' },
    { key: '4', format: '简历', description: '专业简历文档', export: '导出PDF' },
    { key: '5', format: '通用', description: '通用Markdown文档', export: '图片/PDF/HTML' },
  ];

  const apiColumns = [
    { title: '端点', dataIndex: 'endpoint', key: 'endpoint', width: 220 },
    { title: '方法', dataIndex: 'method', key: 'method', width: 80, render: (m: string) => <Tag color={m === 'GET' ? 'green' : 'blue'}>{m}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description' },
  ];

  const apiData = [
    { key: '1', endpoint: '/health', method: 'GET', description: '健康检查' },
    { key: '2', endpoint: '/api', method: 'GET', description: 'API 文档' },
    { key: '3', endpoint: '/api/convert/html', method: 'POST', description: '转换为带样式的 HTML' },
    { key: '4', endpoint: '/api/convert/email', method: 'POST', description: '转换为邮件兼容 HTML' },
    { key: '5', endpoint: '/api/convert/wechat', method: 'POST', description: '转换为微信兼容 HTML' },
    { key: '6', endpoint: '/api/convert/plain', method: 'POST', description: '转换为纯 HTML' },
    { key: '7', endpoint: '/api/convert/templates', method: 'GET', description: '获取所有模板列表' },
  ];

  const collapseItems = [
    {
      key: '1',
      label: <span><FileTextOutlined style={{ marginRight: 8 }} />功能介绍</span>,
      children: (
        <div>
          <Paragraph>
            <Text strong>MD2Anything</Text> 是一款优雅的 Markdown 转换工具，支持将 Markdown 内容转换为多种格式。
          </Paragraph>
          <Title level={5}>支持的输出格式</Title>
          <Table
            columns={formatColumns}
            dataSource={formatData}
            pagination={false}
            size="small"
          />
        </div>
      ),
    },
    {
      key: '2',
      label: <span><SettingOutlined style={{ marginRight: 8 }} />使用指南</span>,
      children: (
        <div>
          <Title level={5}>微信公众号</Title>
          <List
            size="small"
            dataSource={[
              '选择「微信」格式',
              '在编辑器中输入 Markdown 内容',
              '点击「复制」按钮',
              '在微信公众号编辑器中粘贴（Ctrl/Cmd + V）',
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '4px 0' }}><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />{item}</List.Item>
            )}
          />
          <Divider />
          <Title level={5}>小红书</Title>
          <List
            size="small"
            dataSource={[
              '选择「小红书」格式',
              '选择图片尺寸：竖版3:4 / 方形1:1 / 长图',
              '选择分割方式：按分割线 / 自动分割 / 不分割',
              '点击「导出图片」下载',
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '4px 0' }}><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />{item}</List.Item>
            )}
          />
          <Divider />
          <Title level={5}>邮件</Title>
          <List
            size="small"
            dataSource={[
              '选择「邮件」格式',
              '选择邮件模板（商务简约 / 新闻简报 / 营销推广 / 温馨问候 / 极简清新）',
              '输入内容',
              '点击「复制邮件HTML」，粘贴到邮件编辑器',
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '4px 0' }}><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />{item}</List.Item>
            )}
          />
          <Divider />
          <Title level={5}>通用格式</Title>
          <List
            size="small"
            dataSource={[
              '选择「通用」格式',
              '选择模板样式',
              '点击「导出」选择：导出图片 / 导出PDF / 复制HTML代码 / 导出HTML',
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '4px 0' }}><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />{item}</List.Item>
            )}
          />
        </div>
      ),
    },
    {
      key: '3',
      label: <span><HighlightOutlined style={{ marginRight: 8 }} />增强功能</span>,
      children: (
        <div>
          <Title level={5}><UploadOutlined style={{ marginRight: 8 }} />拖拽上传</Title>
          <Paragraph>
            直接将 <Text code>.md</Text> 或 <Text code>.txt</Text> 文件拖入编辑器区域，即可自动加载文件内容。
          </Paragraph>

          <Divider />

          <Title level={5}><BarChartOutlined style={{ marginRight: 8 }} />字数统计</Title>
          <Paragraph>
            底部状态栏实时显示：
          </Paragraph>
          <List
            size="small"
            dataSource={[
              '字数（中英文混合计算）',
              '行数',
              '预估阅读时间（按 300 字/分钟计算）',
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '2px 0' }}><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />{item}</List.Item>
            )}
          />

          <Divider />

          <Title level={5}><HighlightOutlined style={{ marginRight: 8 }} />代码高亮</Title>
          <Paragraph>
            支持 20+ 种编程语言的语法高亮，使用标准代码块语法：
          </Paragraph>
          <pre style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflow: 'auto'
          }}>
            {"```javascript\nconst greeting = \"Hello\";\nconsole.log(greeting);\n```"}
          </pre>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            支持：JavaScript, TypeScript, Python, Java, C/C++, Go, Rust, Bash, JSON, YAML, SQL, Docker 等
          </Paragraph>

          <Divider />

          <Title level={5}><FunctionOutlined style={{ marginRight: 8 }} />数学公式</Title>
          <Paragraph>
            使用 KaTeX 渲染数学公式：
          </Paragraph>
          <List
            size="small"
            dataSource={[
              { type: '行内公式', example: '$E = mc^2$' },
              { type: '块级公式', example: '$$\\sum_{i=1}^{n} x_i$$' },
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '2px 0' }}>
                <Text code>{item.type}</Text>: <Text>{item.example}</Text>
              </List.Item>
            )}
          />

          <Divider />

          <Title level={5}><DeploymentUnitOutlined style={{ marginRight: 8 }} />Mermaid 图表</Title>
          <Paragraph>
            支持 Mermaid 语法绘制流程图、时序图等：
          </Paragraph>
          <pre style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflow: 'auto'
          }}>
            {"```mermaid\ngraph LR\n    A[开始] --> B[处理]\n    B --> C[结束]\n```"}
          </pre>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            支持：流程图、时序图、甘特图、饼图、类图、状态图等
          </Paragraph>
        </div>
      ),
    },
    {
      key: '4',
      label: <span><CodeOutlined style={{ marginRight: 8 }} />技术栈</span>,
      children: (
        <div>
          <List
            size="small"
            dataSource={[
              { label: '框架', value: 'React 19 + TypeScript' },
              { label: '构建工具', value: 'Vite 7' },
              { label: 'UI 组件', value: 'Ant Design 6' },
              { label: '状态管理', value: 'Zustand' },
              { label: 'Markdown 解析', value: 'marked' },
              { label: '代码高亮', value: 'Prism.js (20+ 语言)' },
              { label: '数学公式', value: 'KaTeX' },
              { label: '图表渲染', value: 'Mermaid' },
              { label: '图片导出', value: 'html2canvas' },
              { label: 'PDF 导出', value: 'jsPDF + html2canvas' },
              { label: 'API 服务', value: 'Express.js' },
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '6px 0' }}>
                <Text code>{item.label}</Text>: <Text>{item.value}</Text>
              </List.Item>
            )}
          />
        </div>
      ),
    },
    {
      key: '5',
      label: <span><ApiOutlined style={{ marginRight: 8 }} />API 文档</span>,
      children: (
        <div>
          <Paragraph>
            启动 API 服务：<Text code>npm run server</Text>
          </Paragraph>
          <Paragraph>
            服务地址：<Text code>http://localhost:3001</Text>
          </Paragraph>
          <Title level={5}>可用端点</Title>
          <Table
            columns={apiColumns}
            dataSource={apiData}
            pagination={false}
            size="small"
          />
          <Divider />
          <Title level={5}>请求示例</Title>
          <Paragraph>
            <pre style={{
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              overflow: 'auto'
            }}>
{`curl -X POST http://localhost:3001/api/convert/html \\
  -H "Content-Type: application/json" \\
  -d '{"markdown": "# 标题", "templateId": "general-modern"}'`}
            </pre>
          </Paragraph>
          <Title level={5}>请求参数</Title>
          <List
            size="small"
            dataSource={[
              { name: 'markdown', desc: 'Markdown 文本（必填）' },
              { name: 'templateId', desc: '模板 ID（可选）' },
              { name: 'fontSize', desc: '字体大小，默认 16' },
              { name: 'margin', desc: '边距，默认 24' },
              { name: 'backgroundColor', desc: '背景颜色，默认 #ffffff' },
            ]}
            renderItem={(item) => (
              <List.Item style={{ padding: '4px 0' }}>
                <Text code>{item.name}</Text>: {item.desc}
              </List.Item>
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>使用指南</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      styles={{
        body: { padding: 24, maxHeight: '70vh', overflow: 'auto' },
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 8 }}>MD2Anything</Title>
        <Text type="secondary" style={{ fontSize: 15 }}>Markdown is all you need</Text>
      </div>

      <Paragraph style={{ textAlign: 'center', marginBottom: 24 }}>
        一款优雅的 Markdown 转换工具，支持将 Markdown 内容转换为多种格式，
        包括微信公众号、小红书、邮件、简历、图片、PDF、HTML 等。
      </Paragraph>

      <Divider />

      <Collapse
        items={collapseItems}
        defaultActiveKey={['1']}
        bordered={false}
        style={{ background: '#fafafa' }}
      />

      <Divider />

      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">
          MD2Anything © {new Date().getFullYear()}
        </Text>
      </div>
    </Modal>
  );
};

export default DocsModal;
