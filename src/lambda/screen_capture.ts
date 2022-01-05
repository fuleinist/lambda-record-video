import { APIGatewayProxyHandler } from 'aws-lambda'
const chromium = require('chrome-aws-lambda');
const puppeteer = chromium.puppeteer;

/**
 * The Lambda Function handler
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const { queryStringParameters } = event;
  if (!queryStringParameters || !queryStringParameters.url || !queryStringParameters.screen) {
    return { statusCode: 403, body: 'missing parameters' };
  }

  const { url } = queryStringParameters;
  const [width, height] = queryStringParameters.screen.split(",");

  if (!width || !height) {
    return { statusCode: 403, body: 'missing width & height in screen parameter' };
  }
  //https://ivz1szsn0c.execute-api.us-east-1.amazonaws.com/prod?url=www.google.com&screen=1024,768
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: Number(width),
    height: Number(height)
  });

  await page.goto(url);
  const screenshot = await page.screenshot({ encoding: "base64" });

  return {
    statusCode: 200,
    body: `<img src="data:image/png;base64,${screenshot}">`,
    headers: { "Content-Type" : "text/html" }
  };
}