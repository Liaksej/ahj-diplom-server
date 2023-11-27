import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PrismaClient } from "@prisma/client";
import Busboy, { BusboyHeaders } from "@fastify/busboy";
import { main } from "@/S3";

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
    "/api/send-message/",
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const busboy = new Busboy({ headers: request.headers } as {
        headers: BusboyHeaders;
      });
      try {
        busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
          console.log("File [" + filename + "]: filename: " + filename);

          file.on("error", (error) => {
            console.error("Error occurred while streaming the file: ", error);
            // Also consider cleaning up and/or signalling the error to the client here.
          });

          main({ filename, file });
        });
      } catch (e) {
        reply.code(401).send({ error: "Invalid credentials.ini" });
      }

      // busboy.on("finish", async () => {
      //   const incomingJSON = JSON.parse(incomingFields["message"]);
      //
      //   const addMessage = await prisma.message.create({
      //     data: {
      //       text: incomingJSON.text,
      //       pinned: false,
      //       photoUrl: photoUrl,
      //       user: {
      //         connect: {
      //           email: request.user?.email,
      //         },
      //       },
      //     },
      //     include: {
      //       user: {
      //         select: {
      //           name: true,
      //         },
      //       },
      //     },
      //   });
      // });
    },
  );
}
