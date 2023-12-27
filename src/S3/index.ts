import {
  S3Client,
  PutObjectAclCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { BusboyFileStream } from "@fastify/busboy";

export class S3 {
  s3Client: S3Client;
  params: { Bucket: string; Key: string };
  constructor(filename: string) {
    this.s3Client = new S3Client({
      region: "us-east-2",
      credentials: defaultProvider({
        profile: "default",
      }),
    });
    this.params = {
      Bucket: "liaksejs-bucket",
      Key: filename,
    };
  }

  async uploadToS3(file: BusboyFileStream) {
    try {
      const dataUpload = new Upload({
        client: this.s3Client,
        params: { ...this.params, Body: file },
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
      ...this.params,
      ACL: "public-read",
    });

    await this.s3Client.send(putObjectAclCommand);

    return `https://${this.params.Bucket}.s3.us-east-2.amazonaws.com/${this.params.Key}`;
  }

  async deleteFromS3() {
    try {
      const command = new DeleteObjectCommand(this.params);
      const response = await this.s3Client.send(command);
      console.log("Success, object deleted", response);
    } catch (err) {
      console.log("Error", err);
    }
  }
}
