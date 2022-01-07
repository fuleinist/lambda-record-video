import { APIGatewayProxyHandler, S3Event } from 'aws-lambda'
import { waitForPageEvent } from '../utils/waitForPageEvent';
import { uploadToS3, praseJSONFromS3, getS3ObjectUrl } from '../utils/s3';
import { logConsoleEvent } from '../utils/logConsole';
import * as puppeteer from 'puppeteer-core';
const chromium = require('chrome-aws-lambda');

export type videoRecordResult = {
  blob: Blob
}

/**
 * The Lambda Function handler
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  if(!process.env.Bucket) {
    return {
      statusCode: 500,
      body: `Bucket is required`
    };
  }
  const { queryStringParameters } = event;
  if (!queryStringParameters || !queryStringParameters.url) {
    return { statusCode: 500, body: 'missing parameters' };
  }

  const { url } = queryStringParameters;

  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args
  });

  const page = await browser.newPage();
  const logs: string[] = [];
  logConsoleEvent(page, logs)
  await page.goto(url);
  const pageLoadedResult = (await waitForPageEvent(page, 'pageLoaded', 2000)) as any;
  console.log('pageLoadedResult', pageLoadedResult);
  // wait for custom event "videoRecordComplete", then return the video blob from chromium
  const videoRecordResult = (await waitForPageEvent(page, 'videoRecordComplete', 5 * 60 * 1000)) as videoRecordResult;
  console.log('videoRecordResult', videoRecordResult);
  if(!videoRecordResult?.blob) {
    console.log({ logs })
    console.log( `Missing Blob from page event`);
    return {
      statusCode: 500,
      body: `Missing Blob from page event`
    };
  }
  const s3Result = await uploadToS3(videoRecordResult.blob.stream(), process.env.Bucket, Date.now() + '.mp4');
  console.log({ logs })
  console.log(`video recorded & uploaded to s3: ${JSON.stringify(s3Result)}`);
  return {
    statusCode: 200,
    body: `video record & upload to s3 triggered: ${JSON.stringify(s3Result)}`,
    headers: { "Content-Type" : "text/html" }
  };
}

/**
 * The Lambda Function handler
 */
 export const S3handler: (event: S3Event) => Promise<void>  = async (event) => {
  if(!process.env.Bucket) {
    console.log('Bucket is required');
    return;
  }
  const s3Record = event?.Records?.[0].s3
  if (!s3Record) {
    return;
  }
  const sourceS3Bucket = s3Record.bucket.name
  const sourceS3Key = s3Record.object.key
  const jsonObj = await praseJSONFromS3(sourceS3Key, sourceS3Bucket)
  console.log({ jsonObj });
  const { url } = jsonObj || {};
  if (!jsonObj || !url) {
    !jsonObj && console.log(`Missing JSON from s3: ${sourceS3Key}`);
    !url && console.log(`Missing url from json: ${JSON.stringify(jsonObj)}`);
    return;
  }

  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args,
    env: {
      ...process.env,
      videoConfig: JSON.stringify(jsonObj)
    }
  });

  const page = await browser.newPage();
  const logs: string[] = [];
  logConsoleEvent(page, logs)
  await page.goto(url);
  const pageLoadedResult = (await waitForPageEvent(page, 'pageLoaded', 2000)) as any;
  console.log('pageLoadedResult', pageLoadedResult);
  // wait for custom event "videoRecordComplete", then return the video blob from chromium
  const videoRecordResult = (await waitForPageEvent(page, 'videoRecordComplete', 5 * 60 * 1000)) as videoRecordResult;
  console.log('videoRecordResult', videoRecordResult);
  if(!videoRecordResult?.blob) {
    console.log({ logs })
    console.log( `Missing Blob from page event`);
  }
  const s3Result = await uploadToS3(videoRecordResult.blob.stream(), process.env.Bucket, Date.now() + '.mp4');
  console.log({ logs })
  console.log(`video recorded & uploaded to s3: ${JSON.stringify(s3Result)}`);
}
