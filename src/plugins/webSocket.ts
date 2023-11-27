import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PrismaClient } from "@prisma/client";
import { main as S3 } from "../S3";
import fs from "fs";
import path from "path";

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

export async function webSocket(
  fastify: MyFastifyInstance,
  options: FastifyPluginOptions,
) {
  fastify.get(
    "/api/ws/",
    {
      websocket: true,
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (connection, request: FastifyRequest) => {
      const savedMessages = await prisma.message.findMany({
        take: 100,
        orderBy: {
          date: "asc",
        },
        where: {
          user: {
            email: request.user?.email,
          },
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      connection.socket.send(JSON.stringify(savedMessages));
    },
  );
}
