import React from 'react'
import { Row, Col, Typography, Card } from 'antd'
import { LineChartOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const Monitoring: React.FC = () => {
  return (
    <div style={{ padding: '0 24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={2}>
            <LineChartOutlined style={{ marginRight: 8 }} />
            監視状況
          </Title>
          <Card>
            <Text type="secondary">監視状況機能はまだ実装中です。</Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Monitoring