import database from '../src/db/database';
// import logger from '../src/utils/logger'; // May be used for future logging needs
import { validateRequiredConfig } from '../src/config';

async function initializeDatabase() {
  try {
    console.log('🔧 SteamSentinel - Database Initialization');
    console.log('==========================================\n');

    // 必須設定の検証
    const validation = validateRequiredConfig();
    if (!validation.valid) {
      console.error('❌ Configuration Error:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      console.error('\nPlease set up required configuration in .env file');
      process.exit(1);
    }

    // データベース接続
    console.log('📁 Connecting to database...');
    database.connect();
    
    // データベース初期化
    console.log('🏗️  Creating tables and indexes...');
    database.initialize();
    
    // 整合性チェック
    console.log('🔍 Checking database integrity...');
    const isIntegral = database.checkIntegrity();
    
    if (isIntegral) {
      console.log('✅ Database integrity check passed');
    } else {
      console.error('❌ Database integrity check failed');
      process.exit(1);
    }
    
    console.log('\n✨ Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    database.close();
  }
}

// 実行
initializeDatabase();