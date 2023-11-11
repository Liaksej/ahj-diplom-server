import { FastifyReply, FastifyRequest } from "fastify";
import { webSocket } from "./plugins/webSocket";
import fastifyWebsocket, { SocketStream } from "@fastify/websocket";
import fastifyAuth from "@fastify/auth";
import { root } from "./plugins/root";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const port = process.env.PORT || 3001;
const host = "RENDER" in process.env ? `0.0.0.0` : `localhost`;

const fastify = require("fastify")({
  logger: true,
});

const prisma = new PrismaClient();

fastify
  .decorate(
    "verifyJWT",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        reply.code(401).send({ error: "Token not provided" });
        return;
      }

      try {
        const { email } = jwt.verify(token, process.env.JWT_SECRET!) as {
          email: string;
        };

        const user = await prisma.user.findUnique({
          where: {
            email: email,
          },
        });

        if (!user) {
          reply.code(401).send({ error: "Invalid credentials" });
          return;
        }
      } catch (err) {
        reply.code(401).send({ error: "Invalid token" });
        return;
      }
    },
  )
  .decorate(
    "verifyUserAndPassword",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };
      const user = await prisma.user.findUnique({
        where: {
          email: username,
        },
      });

      if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET!, {
          expiresIn: "24h",
        });

        request.headers.authorization = `Bearer ${token}`;

        return;
      }

      reply.code(401).send({ error: "Invalid credentials" });
      return;
    },
  )
  .register(fastifyAuth);
fastify.register(fastifyWebsocket);
fastify.register(root);
fastify.register(webSocket);

// fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
//   reply.type("text/html").send(html);
// });

const start = async () => {
  try {
    await fastify.listen({ host: host, port: port });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Hello from Render!</title>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
    <script>
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true
        });
      }, 500);
    </script>
    <style>
      @import url("https://p.typekit.net/p.css?s=1&k=vnd5zic&ht=tk&f=39475.39476.39477.39478.39479.39480.39481.39482&a=18673890&app=typekit&e=css");
      @font-face {
        font-family: "neo-sans";
        src: url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff2"), url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/d?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff"), url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/a?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("opentype");
        font-style: normal;
        font-weight: 700;
      }
      html {
        font-family: neo-sans;
        font-weight: 700;
        font-size: calc(62rem / 16);
      }
      body {
        background: white;
      }
      section {
        border-radius: 1em;
        padding: 1em;
        position: absolute;
        top: 50%;
        left: 50%;
        margin-right: -50%;
        transform: translate(-50%, -50%);
      }
      section a {
        text-decoration:none;
        color: #1C151A;
      }
      section a:hover {
        text-decoration:none;
        color: #605A5C;
      }
    </style>
  </head>
  <body>
    <section>
      <a href="https://render.com/docs/deploy-node-fastify-app">Hello from Render using Fastify!</a>
    </section>
  </body>
</html>
`;
