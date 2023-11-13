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
    "/api/auth/",
    {
      preHandler: fastify.auth([fastify.verifyUserAndPassword]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.code(200).send({ message: "Welcome on board" });
        return;
      } catch (e) {
        reply.code(401).send({ error: "Invalid credentials" });
        return;
      }
    },
  );
}
