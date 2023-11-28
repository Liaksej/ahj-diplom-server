import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PrismaClient } from "@prisma/client";
import Busboy, { BusboyHeaders } from "@fastify/busboy";
import { main } from "../S3";
import multipart from "@fastify/multipart";

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
  fastify.register(multipart);
  fastify.post(
    "/api/send-message/",
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let photoUrl: string | undefined;
      let text: string | undefined;

      const parts = await request.parts();

      for await (const part of parts) {
        if (part.type === "file" && part.filename && part.file) {
          try {
            photoUrl = await main({ filename: part.filename, file: part.file });
            console.log(photoUrl);
          } catch (e) {
            console.error("Error: ", e);
            // reply.code(500).send({ error: "Invalid credentials.ini" });
          }
        }
        if (part.type === "field")
          if (part.fieldname === "text" && part.value) {
            text = part.value as string;
          }
      }

      if (!text || !request.user?.email) {
        return;
      }
      const message = await prisma.message.create({
        data: {
          text: text,
          photoUrl: photoUrl,
          pinned: false,
          user: {
            connect: {
              email: request.user?.email,
            },
          },
        },
      });

      reply.code(201).send({ message });
    },
  );
}
