import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PrismaClient } from "@prisma/client";
import { S3 } from "../S3";
import multipart from "@fastify/multipart";
import { ws } from "./webSocket";
import { uuid } from "uuidv4";

const prisma = new PrismaClient();

export async function sendMessage(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });
  fastify.post(
    "/api/send-message/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      let fileUrl: string | undefined;
      let mime: string | undefined;
      let text: string | undefined;
      let fileName: string | undefined;

      const parts = request.parts();
      const email = request.cookies.email;

      for await (const part of parts) {
        if (part.type === "file" && part.filename && part.file) {
          try {
            fileUrl = await new S3(uuid()).uploadToS3(part.file);
            mime = part.mimetype as string;
          } catch (e) {
            console.error("Error: ", e);
            reply.code(500).send({ error: "Something went wrong" });
            return;
          }
        }
        if (part.type === "field") {
          if (part.fieldname === "text" && part.value) {
            text = part.value as string;
          }
          if (part.fieldname === "fileName" && part.value) {
            fileName = part.value as string;
          }
        }
      }

      if (!(email && (text || fileUrl))) {
        return;
      }
      const message = await prisma.message.create({
        data: {
          text: text || "",
          fileUrl: fileUrl || "",
          fileName: fileName || "",
          mime: mime || "",
          pinned: false,
          user: { connect: { email: email as string } },
        },
        include: { user: true },
      });

      if (ws) {
        ws.socket.send(JSON.stringify(message));
        reply.code(201).send({ message });
      } else {
        reply.code(500).send({ error: "Something went wrong" });
      }
    },
  );
}
