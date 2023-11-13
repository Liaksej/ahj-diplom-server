import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { SocketStream } from "@fastify/websocket";
import * as querystring from "querystring";
import { Prisma, PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

interface Message {
  text: string;
}

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

const sessions = new Map<string, string>();

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
