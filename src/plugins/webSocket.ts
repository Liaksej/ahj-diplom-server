import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PrismaClient } from "@prisma/client";

interface QueryRequest extends FastifyRequest {
  Querystring: {
    email?: string;
  };
}

const prisma = new PrismaClient();

export let ws: any = null;

export async function webSocket(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  fastify.get(
    "/api/ws/",
    {
      websocket: true,
    },
    async (connection, request: FastifyRequest) => {
      ws = connection;

      if (!request.query || !(request.query as { email: string }).email) {
        return;
      }

      const email = (request.query as { email: string }).email;

      const savedMessages = await prisma.message.findMany({
        take: 20,
        orderBy: {
          date: "asc",
        },
        where: {
          user: {
            email: email,
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
