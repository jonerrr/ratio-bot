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
    // console.log(vote);
    if (vote.type !== "upvote") return;
    const user = await prisma.user.findUnique({ where: { id: vote.user } });
    if (user)
      await prisma.user.update({
        where: { id: vote.user },
        data: { voteExpire: Date.now() + 43200000 },
      });
    else
      await prisma.user.create({
        data: {
          id: vote.user,
          emojis: Object.keys(emojis) as Emojis[],
          voteExpire: Date.now() + 43200000,
        },
      });
  })
);
