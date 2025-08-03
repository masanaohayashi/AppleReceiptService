#!/bin/bash

# APIエンドポイントURL
API_URL="https://3kziyi0bd5.execute-api.us-east-1.amazonaws.com/prod/"

# レシートデータファイルを選択
RECEIPT_FILE="test_receipt_valid.txt"  # または test_receipt_expired.txt

# レシートデータを読み込み
if [ ! -f "$RECEIPT_FILE" ]; then
    echo "エラー: $RECEIPT_FILE が見つかりません"
    exit 1
fi

RECEIPT_DATA=$(cat "$RECEIPT_FILE")

# curlでPOSTリクエストを送信
echo "APIエンドポイントをテスト中: $API_URL"
echo "使用するレシートファイル: $RECEIPT_FILE"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"receipt-data\": \"$RECEIPT_DATA\"}" \
  | jq '.'