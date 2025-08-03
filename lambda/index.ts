import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import axios from 'axios';

const appleVerifyReceiptUrl = 'https://buy.itunes.apple.com/verifyReceipt';
const appleSandboxVerifyReceiptUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';

const region = process.env.AWS_REGION;
const tableName = process.env.TABLE_NAME;
const sharedSecretParamName = process.env.APPLE_SHARED_SECRET_PARAM_NAME;

const dbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ssmClient = new SSMClient({ region });

let sharedSecret: string | undefined;

async function getSharedSecret(): Promise<string> {
  if (sharedSecret) {
    return sharedSecret;
  }
  if (!sharedSecretParamName) {
    throw new Error('APPLE_SHARED_SECRET_PARAM_NAME is not set');
  }
  const command = new GetParameterCommand({
    Name: sharedSecretParamName,
    WithDecryption: true,
  });
  const response = await ssmClient.send(command);
  if (!response.Parameter?.Value) {
    throw new Error('Could not retrieve shared secret from SSM Parameter Store');
  }
  sharedSecret = response.Parameter.Value;
  return sharedSecret;
}

export const handler = async (event: any): Promise<any> => {
  if (!tableName) {
    console.error('TABLE_NAME is not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error: TABLE_NAME missing' }),
    };
  }

  let receiptData;
  try {
    const body = JSON.parse(event.body);
    receiptData = body['receipt-data'];
    if (!receiptData) {
      throw new Error('receipt-data is missing');
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid request body. "receipt-data" is required.' }),
    };
  }

  try {
    const secret = await getSharedSecret();
    const requestBody = {
      'receipt-data': receiptData,
      password: secret,
      'exclude-old-transactions': true,
    };

    let response = await axios.post(appleVerifyReceiptUrl, requestBody);

    if (response.data.status === 21007) {
      console.log('Sandbox receipt detected. Retrying with sandbox URL.');
      response = await axios.post(appleSandboxVerifyReceiptUrl, requestBody);
    }

    const validationResponse = response.data;

    if (validationResponse.status === 0 && validationResponse.receipt?.in_app) {
      const latestReceipt = validationResponse.receipt.in_app.pop();
      if (latestReceipt) {
        const command = new PutCommand({
          TableName: tableName,
          Item: {
            'receipt-data': receiptData,
            transactionId: latestReceipt.transaction_id,
            productId: latestReceipt.product_id,
            purchaseDate: latestReceipt.purchase_date,
            expiresDate: latestReceipt.expires_date,
            originalTransactionId: latestReceipt.original_transaction_id,
            ...validationResponse,
          },
        });
        await docClient.send(command);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(validationResponse),
    };
  } catch (error: any) {
    console.error('Error validating receipt:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to validate receipt.',
        error: error.message,
      }),
    };
  }
};
