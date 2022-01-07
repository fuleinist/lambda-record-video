import { S3 } from 'aws-sdk';

const s3Client = new S3()

export async function uploadToS3(body: ReadableStream | Buffer, bucket: string, key: string) {
  const params = {Bucket: bucket, Key: key, Body: body, ACL: 'public-read'};
  return s3Client.upload(params).promise();
}

export async function getMetadataFromS3(
  key: string,
  bucket: string
): Promise<S3.GetObjectOutput['Metadata']> {
  const head = await s3Client.headObject({ Bucket: bucket, Key: key }).promise()
  return head.Metadata
}

export async function praseJSONFromS3(
  key: string,
  bucket: string
): Promise<Record<string, any> | undefined> {
  const obj = await s3Client.getObject({ Bucket: bucket, Key: key }).promise()
  const jsonStr = obj.Body?.toString('utf-8')
  let json = undefined;
  try { 
    json = jsonStr ? JSON.parse(jsonStr) : undefined
  } catch (e) {
    console.error(e);
  }
  return json
}

export function getS3ObjectUrl(
  key: string,
  bucket: string,
  region: string
): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}