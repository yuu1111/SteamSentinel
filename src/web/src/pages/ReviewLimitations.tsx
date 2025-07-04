import React from 'react';
import { Card, Typography, Alert, Divider, Tag, List, Space } from 'antd';
import { WarningOutlined, InfoCircleOutlined, ApiOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

const ReviewLimitations: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <ApiOutlined /> レビューシステム制限事項・注意点
      </Title>
      
      <Alert
        message="重要な注意事項"
        description="レビュースコアは参考値として活用してください。異なるプラットフォームの評価基準を統合しているため、完全な精度は保証できません。"
        type="warning"
        icon={<WarningOutlined />}
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Card title="🎯 データソース別制限事項" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          
          <Card size="small" title="Steam レビュー" extra={<Tag color="green">高信頼性</Tag>}>
            <List
              size="small"
              dataSource={[
                '85点 = 85%のユーザーが「おすすめ」を選択（二択評価）',
                '大量のユーザーレビューに基づく高い信頼性',
                'ただし「ネタレビュー」や「バンドワゴン効果」の影響あり',
                'レビュー数が少ない場合は信頼性が低下'
              ]}
              renderItem={item => <List.Item>• {item}</List.Item>}
            />
          </Card>

          <Card size="small" title="IGDB レビュー" extra={<Tag color="orange">中程度信頼性</Tag>}>
            <List
              size="small"
              dataSource={[
                '75点 = 100点満点での専門評価（連続値）',
                'プロレビューアーとユーザー評価の混合',
                'Steam ID → IGDB連携で精度向上を図るも完璧ではない',
                'ゲーム名検索に依存する場合、誤マッチの可能性',
                '日本語ゲーム名の検索精度に課題'
              ]}
              renderItem={item => <List.Item>• {item}</List.Item>}
            />
          </Card>

          <Card size="small" title="OpenCritic レビュー" extra={<Tag color="blue">高信頼性・限定対象</Tag>}>
            <List
              size="small"
              dataSource={[
                '80点 = プロレビューアーの平均評価',
                '専門レビューサイトのみで高い信頼性',
                '対象ゲームが限定的（主に新作・メジャータイトル）',
                'API制限により一部ゲームで取得エラー発生',
                'インディーゲームなどはカバー率が低い'
              ]}
              renderItem={item => <List.Item>• {item}</List.Item>}
            />
          </Card>
        </Space>
      </Card>

      <Card title="⚠️ 統合スコアの制限" style={{ marginBottom: '24px' }}>
        <List
          dataSource={[
            '異なる評価基準: ユーザー評価（Steam）vs プロ評価（IGDB/OpenCritic）',
            'レビュー数の影響: 少数レビューの場合、統計的信頼性が低下',
            '時期的要因: 発売直後のレビューと長期評価の差異',
            '地域差: 地域によるゲーム評価の文化的違い',
            '重み付けアルゴリズム: 主観的な重み設定に依存'
          ]}
          renderItem={item => (
            <List.Item>
              <WarningOutlined style={{ color: '#faad14', marginRight: '8px' }} />
              {item}
            </List.Item>
          )}
        />
      </Card>

      <Card title="🔧 技術的制限" style={{ marginBottom: '24px' }}>
        <List
          dataSource={[
            'キャッシュ依存: 最大24時間の古いデータが表示される可能性',
            'API障害: 個別API障害時は部分的なデータのみ表示',
            'レート制限: IGDB API（4リクエスト/秒）の制限',
            'ゲーム名マッチング: 曖昧検索による誤ったゲームのスコア取得',
            'ネットワーク障害: 一時的なAPI接続エラー'
          ]}
          renderItem={item => (
            <List.Item>
              <DatabaseOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              {item}
            </List.Item>
          )}
        />
      </Card>

      <Card title="📊 スコア解釈ガイド" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div>
            <Text strong>統合スコア範囲:</Text>
            <div style={{ marginTop: '8px' }}>
              <Tag color="red">0-39: 低評価</Tag>
              <Tag color="orange">40-59: 平凡</Tag>
              <Tag color="yellow">60-74: 良好</Tag>
              <Tag color="green">75-89: 優秀</Tag>
              <Tag color="purple">90-100: 傑作</Tag>
            </div>
          </div>
          
          <Divider />
          
          <div>
            <Text strong>重み付け設定:</Text>
            <List
              size="small"
              dataSource={[
                'Steam: 1.5（基本）/ 2.0（1,000レビュー超）',
                'IGDB: 1.8（プロ評価重視）',
                'OpenCritic: 1.5（専門性評価）'
              ]}
              renderItem={item => <List.Item>• {item}</List.Item>}
            />
          </div>
        </Space>
      </Card>

      <Card title="💡 推奨事項" type="inner">
        <List
          dataSource={[
            '複数のレビューソースを確認して総合的に判断してください',
            '統合スコアは参考値として活用し、個別レビューも読むことを推奨',
            'レビュー数が少ない場合は特に注意深く評価してください',
            '発売直後のゲームは時間をおいてから再評価することを推奨',
            '自分の好みに合うレビューアーの意見を重視してください'
          ]}
          renderItem={item => (
            <List.Item>
              <InfoCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
              {item}
            </List.Item>
          )}
        />
      </Card>

      <Alert
        message="データ更新について"
        description="レビューデータは24時間ごとに自動更新されます。最新データが必要な場合は、ゲーム詳細ページで手動更新をお試しください。"
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default ReviewLimitations;