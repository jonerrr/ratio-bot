import { MessageReaction, PartialMessageReaction } from "discord.js";
import * as Sentry from "@sentry/node";
import { prisma } from "../index";
import chalk from "chalk";

export const manageReaction = async (
  reaction: MessageReaction | PartialMessageReaction
) => {
  try {
    if (reaction.partial) await reaction.fetch();

    if (process.env.MODE === "dev")
      console.log(
        chalk.green(
          `\nRatio updated\nMessage: ${reaction.message.id}\nReaction: ${reaction.emoji.name}\nCount:${reaction.count}\n`
        )
      );

    await prisma.ratio
      .update({
        where: { id: reaction.message.id },
        data: { likes: reaction.count },
      })
      .catch((e) => {
        if (process.env.MODE === "dev")
          console.log(
            chalk.red.bold(
              "Error updating ratio, this is probably because the ratio hasn't been created yet."
            )
          );
      });
  } catch (e) {
    if (process.env.MODE === "dev") console.log(chalk.red.bold(e));
    Sentry.captureException(e);
  }
};
