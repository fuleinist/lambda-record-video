import * as path from 'path'
import { Stack, StackProps, aws_lambda as lambda, Duration } from 'aws-cdk-lib';
import * as apiGateway from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";

const layerArn = 'arn:aws:lambda:us-east-1:348861387278:layer:chrome-aws-lambda:4';

export class LambdaRecordVideoStack extends Stack {
  public readonly api1: apiGateway.RestApi;
  public readonly api2: apiGateway.RestApi;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.api1 = new apiGateway.RestApi(this, "Screen Capture API", {
      restApiName: 'Screen Capture Service'
    });

    this.api2 = new apiGateway.RestApi(this, "Canvas Record API", {
      restApiName: 'Canvas Record Service'
    });
    
    const chromeLayer = lambda.LayerVersion.fromLayerVersionArn(this, "Layer", layerArn);

    const bucket = new s3.Bucket(this, "screen-capture-bucket");
    const ScreenCaptureLambda = new NodejsFunction(this, 'screen_capture', {
      memorySize: 512,
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '../src/lambda/screen_capture.ts'),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk', 'chrome-aws-lambda'],
      },
      environment: {
        Bucket: bucket.bucketName
      },
      layers: [chromeLayer],
    })

    const CanvasRecordLambda = new NodejsFunction(this, 'canvas_record', {
      memorySize: 2048,
      timeout: Duration.minutes(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.join(__dirname, '../src/lambda/canvas_record.ts'),
      bundling: {
        minify: true,
        externalModules: ['aws-sdk', 'chrome-aws-lambda'],
      },
      environment: {
        Bucket: bucket.bucketName
      },
      layers: [chromeLayer],
    })

    bucket.grantReadWrite(ScreenCaptureLambda);
    bucket.grantReadWrite(CanvasRecordLambda);

    const getScreenCaptureIntegration = new apiGateway.LambdaIntegration(ScreenCaptureLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    this.api1.root.addMethod("GET", getScreenCaptureIntegration); // GET /

    const getCanvasRecordIntegration = new apiGateway.LambdaIntegration(CanvasRecordLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
    });

    this.api2.root.addMethod("GET", getCanvasRecordIntegration); // GET /
  }
}

