import { PrismaClient } from "@prisma/client";
import * as process from "process";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // const hashedPassword = await bcrypt.hash(process.env.PASSWORD as string, 10);
  //
  // await prisma.user.create({
  //   data: {
  //     name: "Alexey",
  //     email: "1gqFP@example.com",
  //     password: hashedPassword,
  //     messages: {
  //       create: [
  //         {
  //           text: "Hi from Postgres!",
  //           pinned: false,
  //         },
  //         {
  //           text: "Hi from Postgres one more time!",
  //           pinned: false,
  //         },
  //       ],
  //     },
  //   },
  // });

  const allUsers = await prisma.message.findMany({
    where: {
      text: {
        contains: "more time!",
      },
    },
  });
  console.log(allUsers, { depth: null });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
