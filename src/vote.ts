import { Webhook } from "@top-gg/sdk";
import express from "express";
import { prisma } from "./index";
import emojis from "../emojis.json";
import { Emojis } from "@prisma/client";

const webhook = new Webhook(process.env.TOPGG_WEBHOOK);
export const app = express();

app.post(
  "/voted",
  webhook.listener(async (vote) => {
    console.log(vote);
    (await prisma.user.findUnique({ where: { id: vote.user } }))
      ? await prisma.user.create({
          data: {
            id: vote.user,
            voteExpire: Date.now() + 43200000,
            // Make sure your emojis.json emoji names are the same as the emoji enum
            emojis: Object.keys(emojis) as Emojis[],
          },
        })
      : await prisma.user.update({
          where: { id: vote.user },
          data: {
            voteExpire: Date.now() + 43200000,
          },
        });
  })
);
