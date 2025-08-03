import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';

export class AppleReceiptServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for storing receipt validation results
    const table = new dynamodb.Table(this, 'Receipts', {
      partitionKey: { name: 'receipt-data', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development, destroy the table on stack deletion
    });

    // Retrieve the shared secret from SSM Parameter Store
    const appleSharedSecret = ssm.StringParameter.fromSecureStringParameterAttributes(this, 'AppleSharedSecret', {
      parameterName: '/AppleReceiptService/appleSharedSecret',
    });

    // Lambda function for receipt validation
    const receiptValidatorLambda = new lambda.NodejsFunction(this, 'ReceiptValidator', {
      entry: path.join(__dirname, '../lambda/index.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: table.tableName,
        APPLE_SHARED_SECRET_PARAM_NAME: appleSharedSecret.parameterName,
      },
    });

    // Grant the lambda role read/write permissions to our table
    table.grantReadWriteData(receiptValidatorLambda);

    // Grant the lambda role read permissions to the SSM parameter
    appleSharedSecret.grantRead(receiptValidatorLambda);

    // API Gateway to expose the Lambda function
    new apigateway.LambdaRestApi(this, 'ReceiptValidatorApi', {
      handler: receiptValidatorLambda,
      proxy: true,
    });
  }
}
