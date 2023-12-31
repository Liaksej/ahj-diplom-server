import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function serverSideEvent(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
) {
  fastify.get(
    "/api/sse/",
    async function (request: FastifyRequest, reply: FastifyReply) {
      if (!request.query || !(request.query as { email: string }).email) {
        return;
      }

      let lastFileUrls: string | undefined;
      let lastId = 0;

      reply.sse(
        (async function* source() {
          while (true) {
            const { email } = request.query as { email: string };

            const filesUrls = await prisma.message.findMany({
              orderBy: {
                date: "desc",
              },
              where: {
                AND: [{ user: { email: email } }, { fileUrl: { not: null } }],
              },
              select: {
                fileName: true,
                id: true,
                fileUrl: true,
                mime: true,
                date: true,
              },
            });

            const filesUrlsJson = JSON.stringify(filesUrls);

            if (lastFileUrls !== filesUrlsJson) {
              yield { id: String(lastId++), data: filesUrlsJson };
              lastFileUrls = filesUrlsJson;
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        })(),
      );
    },
  );
}
