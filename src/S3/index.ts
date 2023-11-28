import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  S3Client,
  PutObjectAclCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { BusboyFileStream } from "@fastify/busboy";

export const main = async ({
  filename,
  file,
}: {
  filename: string;
  file: BusboyFileStream;
}) => {
  const s3Client = new S3Client({
    region: "us-east-2",
    credentials: defaultProvider({
      profile: "default",
    }),
  });
  const params = {
    Bucket: "liaksejs-bucket",
    Key: filename,
  };

  try {
    const dataUpload = new Upload({
      client: s3Client,
      params: { ...params, Body: file },
    });
    dataUpload.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    await dataUpload.done();
  } catch (error) {
    console.log(error);
    return;
  }

  const putObjectAclCommand = new PutObjectAclCommand({
    ...params,
    ACL: "public-read",
  });

  await s3Client.send(putObjectAclCommand);

  return `https://${params.Bucket}.s3.us-east-2.amazonaws.com/${params.Key}`;
};
