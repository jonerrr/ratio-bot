import { Message, MessageEmbed } from "discord.js";
import { checkUser, emojiList } from "../util";
import * as Sentry from "@sentry/node";
import { prisma } from "../index";
import chalk from "chalk";

export const manageRatio = async (message: Message) => {
  try {
    let emoji = (await checkUser(message.author.id, false)) as string;
    let invalidEmoji: boolean = false;

    await message.react(emoji).catch(async (e) => {
      if (e.code !== 10014) {
        console.log(chalk.red.bold(e));
        Sentry.captureException(e);
        return;
      }
      if (process.env.MODE === "dev")
        console.log(chalk.bgRed("Falling back on default emoji"));
      emoji = emojiList[0];
      await message.react(emoji);
      invalidEmoji = true;
    });

    let msg: Message;

    if (message.reference)
      msg = await message.channel.messages.fetch(message.reference.messageId);

    if (!msg) {
      const msgs: Message[] = Array.from(
        (await message.channel.messages.fetch()).values()
      );

      for (const m of msgs)
        if (
          (message.mentions.users.size &&
            message.mentions.users.first().id === m.author.id) ||
          (!message.mentions.users.size && m.author.id !== message.author.id)
        ) {
          msg = m;
          break;
        }
    }

    let check = await prisma.ratio.findUnique({
      where: { id: msg.id },
    });

    let data = [
      {
        id: message.id,
        userId: message.author.id,
        serverId: message.guild.id,
        username: message.author.username,
        // expire: Date.now() + 2592000000,
        related: msg.id,
      },
    ];

    if (!check) {
      await msg.react(emoji);
      data.push({
        id: msg.id,
        userId: msg.author.id,
        serverId: msg.guild.id,
        username: msg.author.username,
        // expire: Date.now() + 2592000000,
        related: message.id,
      });
    }

    await prisma.ratio.createMany({
      data,
    });

    if (invalidEmoji) {
      await prisma.user.update({
        where: { id: message.author.id },
        data: { customEmoji: null },
      });
      await message.reply({
        embeds: [
          new MessageEmbed()
            .setFooter({
              text: `I noticed you didn't set a valid custom emoji so it was removed.`,
            })
            .setColor("RED"),
        ],
      });
    }
  } catch (e) {
    if (process.env.MODE === "dev") console.log(chalk.red.bold(e));
    Sentry.captureException(e);
  }
};
