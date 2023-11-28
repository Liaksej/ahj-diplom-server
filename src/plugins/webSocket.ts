import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PrismaClient } from "@prisma/client";
import fastifyWebsocket from "@fastify/websocket";

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

export let ws: any = null;

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
      ws = connection;
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

      connection.socket.on("message", async (message) => {
        const newMessage = await prisma.message.findUnique({
          where: {
            id: message.toString(),
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        });
        console.log(newMessage);

        connection.socket.send([newMessage]);
      });
    },
  );
}
