import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PrismaClient } from "@prisma/client";
import { main } from "../S3";
import multipart from "@fastify/multipart";
import { ws } from "./webSocket";

interface MyCustomMethods {
  verifyJWT(
    request: FastifyRequest,
    reply: FastifyReply,
    done: any,
  ): Promise<void>;

  verifyUserAndPassword(
    request: FastifyRequest,
    reply: FastifyReply,
    done: any,
  ): Promise<void>;
}

type MyFastifyInstance = FastifyInstance & MyCustomMethods;

const prisma = new PrismaClient();

export async function sendMessage(
  fastify: MyFastifyInstance,
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

      const parts = request.parts();
      const email = request.cookies.email;

      for await (const part of parts) {
        if (part.type === "file" && part.filename && part.file) {
          try {
            fileUrl = await main({ filename: part.filename, file: part.file });
            mime = part.mimetype as string;
          } catch (e) {
            console.error("Error: ", e);
            reply.code(500).send({ error: "Something went wrong" });
            return;
          }
        }
        if (part.type === "field")
          if (part.fieldname === "text" && part.value) {
            text = part.value as string;
          }
      }

      if (!(email && (text || fileUrl))) {
        return;
      }
      const message = await prisma.message.create({
        data: {
          text: text || "",
          fileUrl: fileUrl || "",
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
