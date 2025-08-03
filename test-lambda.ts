import { handler } from './lambda/index';
import { readFileSync } from 'fs';
import { join } from 'path';

// テスト用のモックイベント
const createTestEvent = (receiptData: string) => ({
  body: JSON.stringify({
    'receipt-data': receiptData
  }),
  headers: {
    'Content-Type': 'application/json'
  }
});

// 環境変数を設定
process.env.AWS_REGION = 'us-east-1';
process.env.APPLE_SHARED_SECRET_PARAM_NAME = '/AppleReceiptService/appleSharedSecret';

console.log('環境変数確認:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('APPLE_SHARED_SECRET_PARAM_NAME:', process.env.APPLE_SHARED_SECRET_PARAM_NAME);

async function testLambda() {
  // テストするレシートファイルを選択
  const receiptFile = 'test_receipt_valid.txt'; // または 'test_receipt_expired.txt'
  
  let sandboxReceiptData: string;
  try {
    sandboxReceiptData = readFileSync(join(__dirname, receiptFile), 'utf8').trim();
  } catch (error) {
    console.error(`${receiptFile}ファイルが見つかりません`);
    return;
  }
  
  if (sandboxReceiptData === 'YOUR_VALID_RECEIPT_DATA_HERE' || sandboxReceiptData === 'YOUR_SANDBOX_RECEIPT_DATA_HERE') {
    console.error(`${receiptFile}に実際のレシートデータを設定してください`);
    return;
  }
  
  console.log(`テスト中のファイル: ${receiptFile}`);

  const event = createTestEvent(sandboxReceiptData);
  
  try {
    console.log('Lambda関数をテスト中...');
    const result = await handler(event);
    
    console.log('ステータスコード:', result.statusCode);
    console.log('レスポンス:', JSON.parse(result.body));
    
    if (result.statusCode === 200) {
      const response = JSON.parse(result.body);
      if (response.status === 0) {
        console.log('✅ レシート検証成功！');
      } else {
        console.log('❌ レシート検証失敗。ステータス:', response.status);
      }
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

testLambda();