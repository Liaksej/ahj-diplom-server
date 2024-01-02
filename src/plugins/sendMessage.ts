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
import { stringifiedJson } from "aws-sdk/clients/customerprofiles";

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
      let geodata = undefined;

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
          if (part.fieldname === "geodata" && part.value) {
            geodata = part.value as string;
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
          geoData: (!!geodata && JSON.parse(geodata)) || undefined,
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

  fastify.delete(
    "/api/send-message/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const email = request.cookies.email;
      const { id } = JSON.parse(request.body as string);

      if (!(email && id)) {
        reply
          .code(404)
          .send({ error: "Message not found or does not belong to the user" });
        return;
      }

      const messageOwnedByUser = await prisma.message.findFirst({
        where: {
          id: id,
          user: {
            email: email,
          },
        },
        include: {
          user: true,
        },
      });

      if (!messageOwnedByUser) {
        reply
          .code(404)
          .send({ error: "Message not found or does not belong to the user" });
        return;
      }

      try {
        if (messageOwnedByUser.fileUrl) {
          await new S3(messageOwnedByUser.fileUrl.slice(-36)).deleteFromS3();
        }
      } catch (e) {
        console.error("Error: ", e);
        reply.code(500).send({ error: "Something went wrong" });
        return;
      }

      try {
        await prisma.message.delete({
          where: {
            id: id,
          },
        });
        reply.code(204).send();
      } catch (e) {
        console.error("Error: ", e);
        reply.code(500).send({ error: "Something went wrong" });
        return;
      }
    },
  );
}
