import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
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

      const { email } = request.query as QueryRequest["Querystring"] & {
        email: string;
      };

      connection.socket.on("message", async function incoming(message) {
        const { event, data } = JSON.parse(message.toString());

        if (event === "getComments") {
          const offset = (data.offset as number) || 0;
          const query = (data.q as string) || "";
          const savedMessages = await prisma.message.findMany({
            skip: offset,
            take: 10,
            orderBy: {
              date: "desc",
            },
            where: query
              ? {
                  AND: [
                    { user: { email: email } },
                    {
                      OR: [
                        {
                          text: {
                            contains: query,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  ],
                }
              : { user: { email: email } },
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          });

          if (savedMessages.length > 0) {
            savedMessages.reverse();
            connection.socket.send(JSON.stringify(savedMessages));
          }
        }
      });
    },
  );
}
