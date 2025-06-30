const fs = require('fs')
const path = require('path')

// ビルド情報を生成
const buildInfo = {
  buildTime: new Date().toISOString(),
  buildDate: new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Tokyo'
  }),
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

// distディレクトリが存在しない場合は作成
const distDir = path.join(__dirname, '..', 'dist')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

// build-info.jsonファイルを作成
const buildInfoPath = path.join(distDir, 'build-info.json')
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2))

console.log('Build info generated:', buildInfo)