import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { SocketStream } from "@fastify/websocket";
import * as querystring from "querystring";

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
      connection.socket.send(
        JSON.stringify({
          text: "Hi from Server!",
          date: new Date(),
          author: "server",
        }),
      );
      connection.socket.on("message", (message) => {
        connection.socket.send(message.toString());
      });
    },
  );
}
