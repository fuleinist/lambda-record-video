import { APIGatewayProxyHandler } from 'aws-lambda'
import { uploadToS3 } from '../utils/s3';
import { Page } from 'puppeteer-core';
import { Readable } from 'stream'
const chromium = require('chrome-aws-lambda');
const puppeteer = chromium.puppeteer;

/**
 * The Lambda Function handler
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  if(!process.env.Bucket) {
    throw new Error('Bucket is required');
  }
  const { queryStringParameters } = event;
  if (!queryStringParameters || !queryStringParameters.url) {
    return { statusCode: 403, body: 'missing parameters' };
  }

  const { url } = queryStringParameters;
  const [width, height] = queryStringParameters.screen?.split(",") || [1024, 768];

  if (!width || !height) {
    return { statusCode: 403, body: 'missing width & height in screen parameter' };
  }
  //https://ivz1szsn0c.execute-api.us-east-1.amazonaws.com/prod?url=www.google.com&screen=1024,768
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args
  });

  const page: Page = await browser.newPage();
  await page.setViewport({
    width: Number(width),
    height: Number(height)
  });

  await page.goto(url);
  const screenshot = await page.screenshot({ encoding: "base64" }) as string;
  const buffer = Buffer.from(screenshot, 'base64');
  await uploadToS3(buffer, process.env.Bucket, `${Date.now()}.png`);
  await page.close();
  await browser.close();
  return {
    statusCode: 200,
    body: `<img src="data:image/png;base64,${screenshot}">`,
    headers: { "Content-Type" : "text/html" }
  };
}