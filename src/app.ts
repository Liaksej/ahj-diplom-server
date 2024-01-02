import { webSocket } from "./plugins/webSocket";
import fastifyWebsocket from "@fastify/websocket";
import * as process from "process";
import { sendMessage } from "./plugins/sendMessage";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { FastifySSEPlugin } from "fastify-sse-v2";
import { serverSideEvent } from "./plugins/serverSideEvent";

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

declare module "fastify" {
  export interface FastifyRequest {
    user?: User;
  }
}

const port = Number(process.env.PORT) || 8080;
const host: string = "RENDER" in process.env ? `0.0.0.0` : `localhost`;

const fastify = require("fastify")({
  logger: true,
});

fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST", "OPTIONS", "DELETE"],
  credentials: true,
});
fastify.register(cookie, {
  hook: "onRequest",
});
fastify.register(fastifyWebsocket);
fastify.register(FastifySSEPlugin);
fastify.register(webSocket);
fastify.register(serverSideEvent);
fastify.register(sendMessage);

const start = async () => {
  try {
    await fastify.listen(
      { host: host, port: port },
      (err: any, address: any) => {
        if (err) {
          fastify.log.error(err);
          process.exit(1);
        }
        fastify.log.info(`server listening on ${address}`);
      },
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
