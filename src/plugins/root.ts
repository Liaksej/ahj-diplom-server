import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { Prisma, PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

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

export async function root(
  fastify: MyFastifyInstance,
  options: FastifyPluginOptions,
) {
  fastify.post(
    "/api/auth",
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };
      const user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });

      if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET!, {
          expiresIn: "24h",
        });

        reply.code(200).send({ token });

        return;
      }

      reply.code(401).send({ error: "Invalid credentials" });
      return;
    },
  );
}
