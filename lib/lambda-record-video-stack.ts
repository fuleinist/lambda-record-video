import * as path from 'path'
import { Stack, StackProps, aws_lambda as lambda } from 'aws-cdk-lib';
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";

const layerArn = 'arn:aws:lambda:us-east-1:348861387278:layer:chrome-aws-lambda:1';
export class LambdaRecordVideoStack extends Stack {
  public readonly api: apiGateway.RestApi;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.api = new apiGateway.RestApi(this, "API", {
      restApiName: 'Screen Capture Service'
    });
    
    const chromeLayer = lambda.LayerVersion.fromLayerVersionArn(this, "Layer", layerArn);

    const bucket = new s3.Bucket(this, "screen-capture-bucket");
    const ScreenCaptureLambda = new NodejsFunction(this, 'screen_capture', {
      memorySize: 2048,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '../src/lambda/screen_capture.ts'),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk', 'chrome-aws-lambda'],
      },
      environment: {
        BUCKET: bucket.bucketName
      },
      layers: [chromeLayer],
    })

    bucket.grantReadWrite(ScreenCaptureLambda); // was: handler.role);

    const getScreenCaptureIntegration = new apiGateway.LambdaIntegration(ScreenCaptureLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    this.api.root.addMethod("GET", getScreenCaptureIntegration); // GET /
  }
}

