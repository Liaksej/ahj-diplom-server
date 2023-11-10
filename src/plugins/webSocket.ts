import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { SocketStream } from "@fastify/websocket";
import * as querystring from "querystring";
import { Prisma, PrismaClient } from "@prisma/client";

interface Message {
  text: string;
}

const prisma = new PrismaClient();

export async function webSocket(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  fastify.get(
    "/api/ws/",
    {
      websocket: true,
      preValidation: async (request, reply) => {
        const query = request.query as { [key: string]: string };
        if (query["x-fastify-header"] !== "fastify is awesome !") {
          await reply.code(401).send({
            error: "Unauthorized",
          });
          return;
        }
      },
    },
    async (connection, req) => {
      const savedMessages = await prisma.message.findMany({
        take: 100,
        orderBy: {
          date: "asc",
        },
        where: {
          user: {
            email: "1gqFP@example.com",
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
        const incomintText = JSON.parse(message.toString()).text;
        const addMessage = await prisma.message.create({
          data: {
            text: incomintText,
            pinned: false,
            user: {
              connect: {
                email: "1gqFP@example.com",
              },
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
        connection.socket.send(JSON.stringify(addMessage));
      });
    },
  );
}
