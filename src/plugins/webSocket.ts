import { FastifyInstance, FastifyPluginOptions } from "fastify";

export async function webSocket(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  //   fastify.addHook("preValidation", async (request, reply) => {
  //   // check if the request is authenticated
  //   if (!request.isAuthenticated()) {
  //     await reply.code(401).send("not authenticated");
  //   }
  // });
  fastify.get("/api/ws/", { websocket: true }, async (connection, req) => {
    connection.socket.send("Hi from server");
    connection.socket.on("message", (message) => {
      connection.socket.send(message.toString());
    });
  });
}
