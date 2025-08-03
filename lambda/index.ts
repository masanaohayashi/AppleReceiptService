import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import axios from 'axios';

const appleVerifyReceiptUrl = 'https://buy.itunes.apple.com/verifyReceipt';
const appleSandboxVerifyReceiptUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';

const region = process.env.AWS_REGION;
const ssmClient = new SSMClient({ region });

let sharedSecret: string | undefined;

async function getSharedSecret(): Promise<string> {
  if (sharedSecret) {
    return sharedSecret;
  }
  const paramName = process.env.APPLE_SHARED_SECRET_PARAM_NAME;
  if (!paramName) {
    throw new Error('APPLE_SHARED_SECRET_PARAM_NAME is not set');
  }
  const command = new GetParameterCommand({
    Name: paramName,
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
