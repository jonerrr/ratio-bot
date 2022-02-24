import { Client, Intents, Message } from "discord.js";
import { REST } from "@discordjs/rest";
import * as Sentry from "@sentry/node";
import { Routes } from "discord-api-types/v9";
import { PrismaClient } from "@prisma/client";
// import { Api } from "@top-gg/sdk";
import { AutoPoster } from "topgg-autoposter";

import { config } from "dotenv";

config();
import { app } from "./vote";
import { getRatioCount, commands } from "./util";
import { manageReaction } from "./events/reaction";
import { manageInteraction } from "./events/interactions";
import { manageRatio } from "./events/ratio";
import chalk from "chalk";

// const topGG = new Api(process.env.TOPGG_TOKEN);
app.listen(3333);
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.25,
});
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});
if (process.env.MODE !== "dev") AutoPoster(process.env.TOPGG_TOKEN, client);
const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);
export const prisma = new PrismaClient();

let cacheExpire: number = Date.now();

client.on("ready", async () => {
  await prisma.$connect();
  console.log(
    chalk.blue.bold(
      `Logged in as ${client.user.tag}\nMode: ${process.env.MODE}`
    )
  );

  client.user.setPresence({
    status: "dnd",
    activities: [{ name: `Ratio Bot ${process.env.MODE}`, type: "PLAYING" }],
  });

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, process.env.TEST_GUILD),
    { body: commands }
  );
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands,
  });

  console.log(chalk.yellow(`${commands.length} application commands loaded`));
});

client.on("messageCreate", async (message: Message) => {
  if (process.env.MODE === "dev" && message.content === "ping")
    await message.channel.send("pong");

  if (
    message.author.id === process.env.OWNER_ID &&
    message.content.toLowerCase() === "nope freak you" &&
    message.reference
  ) {
    const msg = await message.channel.messages.fetch(
      message.reference.messageId
    );
    const ratioData = await prisma.ratio.findUnique({ where: { id: msg.id } });
    if (!ratioData) {
      message.channel.send({
        content: "No ratio found <:SAD:946538361110290472>",
      });
      return;
    }

    await prisma.ratio.delete({ where: { id: msg.id } });
    await prisma.ratio.delete({ where: { id: ratioData.related } });
    await msg.reactions.removeAll();
    const msg2 = await message.channel.messages.fetch(ratioData.related);
    await msg2.reactions.removeAll();

    await message.channel.send(
      "https://cdn.discordapp.com/attachments/727698391173431310/946537786645827584/caption.gif"
    );
  }

  if (message.author.bot || !message.content.match(/(?:^|\W)ratio(?:$|\W)/gim))
    return;

  await manageRatio(message);

  if (cacheExpire > Date.now()) return;
  client.user.setPresence({
    status: "idle",
    activities: [
      {
        name: `${await getRatioCount()} ratios ${
          process.env.MODE === "dev" ? "(dev)" : ""
        }`,
        type: "WATCHING",
      },
    ],
  });

  // await prisma.ratio.deleteMany({
  //   where: { expire: { lt: Date.now() } },
  // });

  cacheExpire = Date.now() + 60000;
});

client.on("interactionCreate", async (interaction) =>
  manageInteraction(
    interaction,
    client.guilds.cache.size,
    client.guilds.cache.map((g) => g.memberCount).reduce((a, c) => a + c)
  )
);

client.on("messageReactionAdd", (reaction) => manageReaction(reaction));
client.on("messageReactionRemove", (reaction) => manageReaction(reaction));

client.login(process.env.TOKEN);
