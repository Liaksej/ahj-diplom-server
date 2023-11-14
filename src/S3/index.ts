import {
  GetObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import fs from "fs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

class S3 {
  s3: S3Client;
  constructor(config) {
    this.s3 = new S3Client(config);
  }

  async uploadFile(bucketName: string, fileName: string, filePath: string) {
    const params = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: fs.createReadStream(filePath),
      ACL: "public-read",
    });

    try {
      await this.s3.send(params);
      console.log("File upload successful");
      return this.getPreSignedUrl(bucketName, fileName);
    } catch (err) {
      console.error("File upload failed:", err);
    }
  }

  async generateFileUrl(bucketName: string, fileName: string) {
    const command= new GetObjectCommand({ Bucket: bucketName, Key: key });

    return getSignedUrl(this.s3, command, { expiresIn: 3600 }); // URL expires in 1 hour
}

const s3 = new S3Client({
  region: "us-east-2",
  credentials: defaultProvider({
    profile: "default",
  }),
});

const run = async () => {
  try {
    const data = await s3.send(
      new ListObjectsCommand({ Bucket: "liaksejs-bucket" }),
    );
    console.log("Success", data);
  } catch (err) {
    console.log("Error", err);
  }
};

run();
