English follows Japanese

# Apple In-App Purchase レシート検証サービス

このプロジェクトは、AWS CDKを使用して構築された、AppleのIn-App Purchaseレシートを検証するためのサーバーレスバックエンドサービスです。

API Gateway, Lambda, DynamoDBで構成されており、安全かつスケーラブルにレシートの検証と結果の保存を行います。

## 背景

Appleの最新の購入APIであるStoreKit 2では、App StoreサーバーAPIを利用することで、アプリ側から安全にユーザーの購入履歴やサブスクリプションの状態を取得できます。しかし、JUCEフレームワーク（v8時点）は依然として従来のStoreKit 1をベースにしています。JUCEのStoreKit 1実装では購入フローを実装できますが、購入後に発行されるレシートを取得するコードは自前で実装する必要があります。さらに、取得したレシートを検証してサブスクリプションの有効期限などを正確に把握する仕組みも提供されていません。

このサービスは、そのギャップを埋め、JUCEベースのアプリでもサーバーサイドでレシートを検証し、サブスクリプションの状態などを管理できるようにするために作成されました。

## 主な機能

-   **サーバーレス**: AWS Lambdaを中心に構築されており、サーバー管理が不要です。
-   **Infrastructure as Code**: AWS CDKを使用してすべてのインフラがコードで定義されています。
-   **セキュア**: Appleの共有シークレットはAWS Systems Manager (SSM) Parameter Storeで安全に管理されます。
-   **自動環境切り替え**: 本番レシートとSandboxレシートを自動的に判別し、適切なAppleの検証エンドポイントにリクエストを送信します。

---

## 1. シークレットの設定方法

このサービスでは、Appleの共有シークレットをAWS Systems Manager (SSM) Parameter Storeに保存する必要があります。

1.  デプロイしたいAWSアカウントとリージョンにログインします。
2.  SSM Parameter Storeのコンソールを開きます。
3.  以下の設定で新しいパラメータを作成します。
    -   **名前**: `/AppleReceiptService/appleSharedSecret`
    -   **タイプ**: `SecureString`
    -   **値**: ご自身のApple In-App Purchaseの共有シークレット

---

## 2. デプロイ方法

### 前提条件

-   Node.js (v18以上)
-   AWS CDK Toolkit (`npm install -g aws-cdk`)
-   Docker Desktop (Lambdaのビルドに必要)
-   AWS認証情報がローカル環境に設定済みであること (`aws configure`など)

### 手順

1.  **リポジトリをクローン:**
    ```bash
    git clone https://github.com/masanaohayashi/AppleReceiptService.git
    cd AppleReceiptService
    ```

2.  **依存関係をインストール:**
    ```bash
    npm install
    ```

3.  **デプロイリージョンの設定 (任意):**
    デフォルトでは `us-east-1` にデプロイされます。変更する場合は `bin/apple_receipt_service.ts` ファイル内の `region` を編集してください。

4.  **CDKブートストラップ:**
    対象のAWSアカウントとリージョンで初めてCDKを使用する場合、一度だけ以下のコマンドを実行して初期設定を行う必要があります。
    ```bash
    cdk bootstrap
    ```

5.  **デプロイ:**
    ```bash
    cdk deploy
    ```
    デプロイが完了すると、APIエンドポイントのURLが出力されます。

---

## 3. アプリ側からの呼び出し方

デプロイが完了すると出力されるAPIエンドポイントURLに対して、HTTP POSTリクエストを送信します。

**エンドポイントURLの例:**
`https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/`

**リクエスト形式:**

-   **Method:** `POST`
-   **Headers:** `Content-Type: application/json`
-   **Body (JSON):**
    ```json
    {
      "receipt-data": "ここにApp Storeから受け取ったBase64エンコード済みのレシート文字列"
    }
    ```

**レスポンス:**
Appleの検証サーバーからのレスポンスがそのままJSON形式で返却されます。
検証に成功した場合、`status`が`0`になります。

---
---

# Apple In-App Purchase Receipt Validation Service

This project is a serverless backend service for validating Apple's In-App Purchase receipts, built with the AWS CDK.

It consists of API Gateway, Lambda, and DynamoDB, providing a secure and scalable way to validate receipts and store the results.

## Background

With Apple's latest purchase API, StoreKit 2, apps can securely fetch a user's purchase history and subscription status directly from the App Store Server API. However, the JUCE framework (as of v8) is still based on the legacy StoreKit 1. While JUCE's StoreKit 1 implementation allows for building the purchase flow, developers must write their own code to retrieve the receipt issued after a purchase. Furthermore, JUCE does not provide a built-in mechanism to validate this receipt to accurately determine details like subscription expiration dates.

This service was created to bridge that gap, enabling JUCE-based applications to perform server-side receipt validation and manage subscription statuses effectively.

## Features

-   **Serverless**: Built around AWS Lambda, eliminating the need for server management.
-   **Infrastructure as Code**: All infrastructure is defined as code using the AWS CDK.
-   **Secure**: The Apple shared secret is securely managed using AWS Systems Manager (SSM) Parameter Store.
-   **Automatic Environment Switching**: Automatically detects and handles both production and sandbox receipts by sending requests to the appropriate Apple verification endpoint.

---

## 1. How to Set Up the Secret

This service requires you to store your Apple shared secret in the AWS Systems Manager (SSM) Parameter Store.

1.  Log in to the AWS account and region where you want to deploy the service.
2.  Open the SSM Parameter Store console.
3.  Create a new parameter with the following settings:
    -   **Name**: `/AppleReceiptService/appleSharedSecret`
    -   **Type**: `SecureString`
    -   **Value**: Your Apple In-App Purchase shared secret

---

## 2. How to Deploy

### Prerequisites

-   Node.js (v18 or later)
-   AWS CDK Toolkit (`npm install -g aws-cdk`)
-   Docker Desktop (required for building the Lambda function)
-   AWS credentials configured in your local environment (e.g., via `aws configure`)

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/masanaohayashi/AppleReceiptService.git
    cd AppleReceiptService
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure the deployment region (optional):**
    By default, the service is deployed to `us-east-1`. To change this, edit the `region` in the `bin/apple_receipt_service.ts` file.

4.  **Bootstrap CDK:**
    If this is your first time using the CDK in the target AWS account and region, you must run the following command once to perform the initial setup.
    ```bash
    cdk bootstrap
    ```

5.  **Deploy:**
    ```bash
    cdk deploy
    ```
    Once the deployment is complete, the API endpoint URL will be displayed in the output.

---

## 3. How to Call from Your App

Send an HTTP POST request to the API endpoint URL that was output upon deployment.

**Example Endpoint URL:**
`https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/`

**Request Format:**

-   **Method:** `POST`
-   **Headers:** `Content-Type: application/json`
-   **Body (JSON):**
    ```json
    {
      "receipt-data": "The Base64-encoded receipt string received from the App Store"
    }
    ```

**Response:**
The response from Apple's verification server will be returned directly in JSON format.
If the validation is successful, the `status` will be `0`.
