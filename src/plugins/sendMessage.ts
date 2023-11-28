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
    { preHandler: fastify.auth([fastify.verifyJWT]) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let photoUrl: string | undefined;
      let text: string | undefined;

      const parts = await request.parts();

      for await (const part of parts) {
        if (part.type === "file" && part.filename && part.file) {
          try {
            photoUrl = await main({ filename: part.filename, file: part.file });
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

      if (!(request.user?.email && (text || photoUrl))) {
        return;
      }
      const message = await prisma.message.create({
        data: {
          text: text || "",
          photoUrl: photoUrl,
          pinned: false,
          user: {
            connect: {
              email: request.user?.email,
            },
          },
        },
        include: {
          user: true,
        },
      });

      if (ws) {
        ws.socket.send(JSON.stringify(message));
        reply.code(201).send({ message });
      }
    },
  );
}
