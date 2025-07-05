import React, { useState } from 'react';
import { Card, Typography, Tabs, Table, Tag, Space, Button, Modal, message } from 'antd';
import { ApiOutlined, BugOutlined, DatabaseOutlined, SettingOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Endpoint {
  method: string;
  path: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  body?: { field: string; type: string; required: boolean; description: string }[];
  response: string;
}

const ApiDocs: React.FC = () => {
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);

  const gameEndpoints: Endpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/games',
      description: 'ゲーム一覧を取得',
      parameters: [
        { name: 'limit', type: 'number', required: false, description: 'ページサイズ (1-100)' },
        { name: 'offset', type: 'number', required: false, description: 'オフセット' },
        { name: 'enabled', type: 'string', required: false, description: 'true/false/all' },
        { name: 'search', type: 'string', required: false, description: '検索キーワード' }
      ],
      response: '{ success: true, data: Game[], meta: { pagination, performance } }'
    },
    {
      method: 'GET',
      path: '/api/v1/games/:id',
      description: 'ゲーム詳細を取得',
      parameters: [
        { name: 'id', type: 'number', required: true, description: 'ゲームID' }
      ],
      response: '{ success: true, data: Game }'
    },
    {
      method: 'POST',
      path: '/api/v1/games',
      description: '新しいゲームを追加',
      body: [
        { field: 'steam_app_id', type: 'number', required: true, description: 'Steam App ID' },
        { field: 'name', type: 'string', required: true, description: 'ゲーム名' },
        { field: 'enabled', type: 'boolean', required: false, description: '監視有効' },
        { field: 'price_threshold', type: 'number', required: false, description: '価格しきい値' }
      ],
      response: '{ success: true, data: Game, message: string }'
    },
    {
      method: 'PUT',
      path: '/api/v1/games/:id',
      description: 'ゲーム情報を更新',
      parameters: [
        { name: 'id', type: 'number', required: true, description: 'ゲームID' }
      ],
      body: [
        { field: 'name', type: 'string', required: false, description: 'ゲーム名' },
        { field: 'enabled', type: 'boolean', required: false, description: '監視有効' },
        { field: 'price_threshold', type: 'number', required: false, description: '価格しきい値' }
      ],
      response: '{ success: true, data: Game, message: string }'
    },
    {
      method: 'DELETE',
      path: '/api/v1/games/:id',
      description: 'ゲームを削除',
      parameters: [
        { name: 'id', type: 'number', required: true, description: 'ゲームID' }
      ],
      response: '{ success: true, message: string }'
    },
    {
      method: 'GET',
      path: '/api/v1/games/:id/price-history',
      description: 'ゲームの価格履歴を取得',
      parameters: [
        { name: 'id', type: 'number', required: true, description: 'ゲームID' },
        { name: 'days', type: 'number', required: false, description: '取得日数 (1-365)' }
      ],
      response: '{ success: true, data: PriceHistory[] }'
    }
  ];

  const alertEndpoints: Endpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/alerts',
      description: 'アラート一覧を取得',
      parameters: [
        { name: 'limit', type: 'number', required: false, description: 'ページサイズ' },
        { name: 'offset', type: 'number', required: false, description: 'オフセット' },
        { name: 'type', type: 'string', required: false, description: 'アラートタイプ' },
        { name: 'unread', type: 'boolean', required: false, description: '未読のみ' }
      ],
      response: '{ success: true, data: Alert[], meta: { pagination } }'
    },
    {
      method: 'GET',
      path: '/api/v1/alerts/:id',
      description: 'アラート詳細を取得',
      parameters: [
        { name: 'id', type: 'number', required: true, description: 'アラートID' }
      ],
      response: '{ success: true, data: Alert }'
    },
    {
      method: 'PUT',
      path: '/api/v1/alerts/:id/read',
      description: 'アラートを既読にマーク',
      parameters: [
        { name: 'id', type: 'number', required: true, description: 'アラートID' }
      ],
      response: '{ success: true, message: string }'
    },
    {
      method: 'PUT',
      path: '/api/v1/alerts/read',
      description: '複数アラートを既読にマーク',
      body: [
        { field: 'alert_type', type: 'string', required: false, description: 'アラートタイプ' },
        { field: 'game_id', type: 'number', required: false, description: 'ゲームID' }
      ],
      response: '{ success: true, data: { updatedCount: number } }'
    },
    {
      method: 'DELETE',
      path: '/api/v1/alerts/:id',
      description: 'アラートを削除',
      parameters: [
        { name: 'id', type: 'number', required: true, description: 'アラートID' }
      ],
      response: '{ success: true, message: string }'
    }
  ];

  const monitoringEndpoints: Endpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/monitoring/status',
      description: 'モニタリング状態を取得',
      response: '{ success: true, data: { isRunning: boolean, lastRun: string } }'
    },
    {
      method: 'GET',
      path: '/api/v1/monitoring/progress',
      description: 'モニタリング進捗を取得',
      response: '{ success: true, data: { current: number, total: number } }'
    },
    {
      method: 'POST',
      path: '/api/v1/monitoring/run',
      description: '手動モニタリングを実行',
      body: [
        { field: 'game_id', type: 'number', required: false, description: '特定ゲームID' },
        { field: 'force', type: 'boolean', required: false, description: '強制実行' }
      ],
      response: '{ success: true, message: string }'
    },
    {
      method: 'GET',
      path: '/api/v1/monitoring/health',
      description: 'システムヘルスチェック',
      response: '{ success: true, data: { status: string, uptime: number } }'
    }
  ];

  const systemEndpoints: Endpoint[] = [
    {
      method: 'GET',
      path: '/api/v1/system/info',
      description: 'システム情報を取得',
      response: '{ success: true, data: { nodeVersion, platform, environment } }'
    },
    {
      method: 'GET',
      path: '/api/v1/system/api-status',
      description: 'API設定状況を確認',
      response: '{ success: true, data: { steamApiKey: boolean, discordWebhook: boolean } }'
    },
    {
      method: 'GET',
      path: '/api/v1/discord/status',
      description: 'Discord連携状態を取得',
      response: '{ success: true, enabled: boolean, message: string }'
    },
    {
      method: 'POST',
      path: '/api/v1/discord/test',
      description: 'Discordテストメッセージを送信',
      body: [
        { field: 'type', type: 'string', required: true, description: 'connection/price_alert/high_discount/epic_free' }
      ],
      response: '{ success: true, message: string }'
    },
    {
      method: 'GET',
      path: '/api/v1/health',
      description: 'APIヘルスチェック',
      response: '{ success: true, status: "healthy", timestamp: string, version: string }'
    }
  ];

  const renderEndpointTable = (endpoints: Endpoint[]) => {
    const columns = [
      {
        title: 'メソッド',
        dataIndex: 'method',
        key: 'method',
        width: 80,
        render: (method: string) => {
          const color = {
            GET: 'blue',
            POST: 'green',
            PUT: 'orange',
            DELETE: 'red'
          }[method] || 'default';
          return <Tag color={color}>{method}</Tag>;
        }
      },
      {
        title: 'エンドポイント',
        dataIndex: 'path',
        key: 'path',
        render: (path: string) => <Text code>{path}</Text>
      },
      {
        title: '説明',
        dataIndex: 'description',
        key: 'description'
      },
      {
        title: 'アクション',
        key: 'action',
        width: 120,
        render: (_: any, record: Endpoint) => (
          <Space>
            <Button 
              size="small" 
              icon={<BugOutlined />}
              onClick={() => {
                setSelectedEndpoint(record);
                setTestModalVisible(true);
              }}
            >
              テスト
            </Button>
          </Space>
        )
      }
    ];

    return (
      <Table
        dataSource={endpoints.map((endpoint, index) => ({ ...endpoint, key: index }))}
        columns={columns}
        pagination={false}
        size="small"
      />
    );
  };

  const testEndpoint = async () => {
    if (!selectedEndpoint) return;

    try {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}${selectedEndpoint.path.replace(':id', '1').replace(':appId', '440')}`;
      
      const response = await fetch(url, {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        message.success(`API テスト成功: ${selectedEndpoint.method} ${selectedEndpoint.path}`);
        console.log('API Response:', data);
      } else {
        message.error(`API テスト失敗: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      message.error(`API テスト中にエラーが発生しました: ${error}`);
    }
    
    setTestModalVisible(false);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={1}>
        <ApiOutlined /> RESTful API ドキュメント
      </Title>
      
      <Paragraph>
        SteamSentinel v2.0 RESTful API の完全なドキュメントです。
        すべてのエンドポイントは <Text code>/api/v1</Text> プレフィックスを使用します。
      </Paragraph>

      <Card style={{ marginBottom: '24px' }}>
        <Title level={3}>基本情報</Title>
        <ul>
          <li><strong>ベースURL:</strong> <Text code>/api/v1</Text></li>
          <li><strong>認証:</strong> 現在は不要（v3.0で実装予定）</li>
          <li><strong>レスポンス形式:</strong> JSON</li>
          <li><strong>エラーハンドリング:</strong> 統一されたエラーレスポンス</li>
          <li><strong>レート制限:</strong> 有効（開発環境では無効）</li>
        </ul>
      </Card>

      <Card style={{ marginBottom: '24px' }}>
        <Title level={3}>レスポンス形式</Title>
        <Paragraph>
          すべてのAPIレスポンスは以下の統一形式を使用します：
        </Paragraph>
        <pre style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px' }}>
{`{
  "success": boolean,
  "data": any,           // 成功時のデータ
  "error": string,       // エラー時のメッセージ
  "message": string,     // 操作メッセージ
  "meta": {
    "pagination": {      // ページング情報
      "total": number,
      "limit": number,
      "offset": number,
      "hasMore": boolean
    },
    "performance": {     // パフォーマンス情報
      "query_time_ms": number,
      "cache_hit": boolean
    }
  }
}`}
        </pre>
      </Card>

      <Tabs defaultActiveKey="games" type="card">
        <TabPane tab={<span><DatabaseOutlined /> ゲーム管理</span>} key="games">
          <Card>
            <Title level={4}>ゲーム関連API</Title>
            {renderEndpointTable(gameEndpoints)}
          </Card>
        </TabPane>

        <TabPane tab={<span><BugOutlined /> アラート管理</span>} key="alerts">
          <Card>
            <Title level={4}>アラート関連API</Title>
            {renderEndpointTable(alertEndpoints)}
          </Card>
        </TabPane>

        <TabPane tab={<span><SettingOutlined /> モニタリング</span>} key="monitoring">
          <Card>
            <Title level={4}>モニタリング関連API</Title>
            {renderEndpointTable(monitoringEndpoints)}
          </Card>
        </TabPane>

        <TabPane tab={<span><ApiOutlined /> システム</span>} key="system">
          <Card>
            <Title level={4}>システム関連API</Title>
            {renderEndpointTable(systemEndpoints)}
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title={`API テスト: ${selectedEndpoint?.method} ${selectedEndpoint?.path}`}
        open={testModalVisible}
        onOk={testEndpoint}
        onCancel={() => setTestModalVisible(false)}
        okText="テスト実行"
        cancelText="キャンセル"
      >
        <Paragraph>
          このエンドポイントをテストしますか？結果はブラウザのコンソールに出力されます。
        </Paragraph>
        {selectedEndpoint?.parameters && (
          <div>
            <Title level={5}>パラメータ:</Title>
            <ul>
              {selectedEndpoint.parameters.map((param, index) => (
                <li key={index}>
                  <Text code>{param.name}</Text> ({param.type})
                  {param.required && <Tag color="red">必須</Tag>}
                  - {param.description}
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedEndpoint?.body && (
          <div>
            <Title level={5}>リクエストボディ:</Title>
            <ul>
              {selectedEndpoint.body.map((field, index) => (
                <li key={index}>
                  <Text code>{field.field}</Text> ({field.type})
                  {field.required && <Tag color="red">必須</Tag>}
                  - {field.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApiDocs;