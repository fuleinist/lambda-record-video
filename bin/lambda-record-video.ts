#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaRecordVideoStack } from '../lib/lambda-record-video-stack';

const app = new cdk.App();

new LambdaRecordVideoStack(app, `LambdaRecordVideoStack`, { env: { region: 'us-east-1' } })
app.synth()