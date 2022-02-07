import {
  Client,
  Intents,
  Message,
  MessageEmbed,
  MessageReaction,
  PartialMessageReaction,
  // SnowflakeUtil,
} from "discord.js";
// import { chart } from "highcharts";
import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import * as Sentry from "@sentry/node";
import { Routes } from "discord-api-types/v9";
import { Emojis } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { Api } from "@top-gg/sdk";
import { AutoPoster } from "topgg-autoposter";

import { config } from "dotenv";

config();
import { app } from "./vote";
import {
  numberEmojis,
  voteRow,
  md,
  loadingEmbed,
  getRatioCount,
  checkUser,
  emojiList,
  chooseEmojiRow,
} from "./util";

const topGG = new Api(process.env.TOPGG_TOKEN);
app.listen(3000);
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
if (process.env.mode !== "DEV") AutoPoster(process.env.TOPGG_TOKEN, client);
const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);
export const prisma = new PrismaClient();

let cacheExpire: number = Date.now();

client.on("ready", async () => {
  await prisma.$connect();
  console.log(`Logged in as ${client.user.tag}\nMode: ${process.env.MODE}`);

  client.user.setPresence({
    status: "dnd",
    activities: [{ name: `Ratio Bot ${process.env.MODE}`, type: "PLAYING" }],
  });

  const commands = [
    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("Ratio Leaderboard")
      .addBooleanOption((option) =>
        option.setName("global").setDescription("Fetch global leaderboard")
      ),
    new SlashCommandBuilder()
      .setName("stats")
      .setDescription("Ratio Statistics")
      .addBooleanOption((option) =>
        option.setName("global").setDescription("Global statistics")
      ),
    new SlashCommandBuilder()
      .setName("emoji")
      .setDescription("Set emoji color (Vote required)"),
  ].map((command) => command.toJSON());

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, process.env.GUILD),
    { body: commands }
  );
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands,
  });
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot || !message.content.match(/(?:^|\W)ratio(?:$|\W)/gim))
    return;

  try {
    const emoji = (await checkUser(message.author.id, false)) as string;
    // ? ratioEmojis[Math.floor(Math.random() * ratioEmojis.length)]
    // : ratioEmojis[0];

    await message.react(emoji);
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

    let check: boolean = !!(await prisma.ratio.findUnique({
      where: { id: msg.id },
    }));

    let data = [
      {
        id: message.id,
        userId: message.author.id,
        serverId: message.guild.id,
        username: message.author.username,
        expire: Date.now() + 2592000000,
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
        expire: Date.now() + 2592000000,
        related: message.id,
      });
    }

    await prisma.ratio.createMany({
      data,
    });

    if (cacheExpire > Date.now()) return;
    client.user.setPresence({
      status: "idle",
      activities: [
        {
          name: `${await getRatioCount()} ratios`,
          type: "WATCHING",
        },
      ],
    });

    // await prisma.ratio.deleteMany({
    //   where: { expire: { lt: Date.now() } },
    // });

    cacheExpire = Date.now() + 60000;
  } catch (e) {
    if (process.env.mode === "DEV") console.log(e);
    Sentry.captureException(e);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isSelectMenu()) {
    const data = interaction.customId.split("_");
    await prisma.user.update({
      where: { id: data[1] },
      // Just in case there are duplicates (IDK if this can actually happen)
      data: { emojis: [...new Set(interaction.values as Emojis[])] },
    });

    return await interaction.reply({
      embeds: [
        new MessageEmbed()
          .setTitle("Emoji Colors Updated")
          .setDescription(
            `Currently selected emojis:\n${(
              (await checkUser(interaction.user.id, true)) as string[]
            ).join("")}`
          )
          .setColor("RANDOM"),
      ],
      ephemeral: true,
    });
  }

  if (!interaction.isCommand()) return;

  const operation: any = {};
  const notGlobal =
    !interaction.options.getBoolean("global") && interaction.inGuild();
  if (notGlobal) operation.where = { serverId: interaction.guild.id };

  switch (interaction.commandName) {
    case "emoji":
      return await interaction.reply(
        (await topGG.hasVoted(interaction.user.id))
          ? {
              embeds: [
                new MessageEmbed()
                  .setTitle("Set Emoji Color")
                  .setDescription(
                    `Currently selected emojis:\n${(
                      (await checkUser(interaction.user.id, true)) as string[]
                    ).join("")}`
                  )
                  .setColor("RANDOM"),
              ],
              components: [chooseEmojiRow(interaction.user.id)],
              ephemeral: true,
            }
          : {
              embeds: [
                new MessageEmbed()
                  .setFooter({
                    text: "You haven't voted yet!",
                  })
                  .setColor("DARK_RED"),
              ],
              components: [voteRow],
              ephemeral: true,
            }
      );

    case "leaderboard":
      await interaction.reply({
        embeds: [loadingEmbed],
      });

      operation.orderBy = { likes: "desc" };
      operation.take = 10;

      const ratios = await prisma.ratio.findMany(operation);

      let desc = "";
      for (let i = 0; i < ratios.length; i++) {
        const related = await prisma.ratio.findUnique({
          where: { id: ratios[i].related },
        });
        desc += `${numberEmojis[i]} ${ratios[i].username} ${emojiList[0]}**${ratios[i].likes}** ${md}≥${md} ${related.username} ${emojiList[0]}**${related.likes}**\n\n`;
      }

      await interaction.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle(
              `Ratio Leaderboard ${
                notGlobal ? `for ${interaction.guild.name}` : "Globally"
              }`
            )
            .setColor("RANDOM")
            .setDescription(
              desc === "" ? "There are no ratios in this server." : desc
            )
            .setFooter({
              text: `Ratio Bot • Created by jonah#1234`,
            }),
        ],
        components: [voteRow],
      });
      break;
    case "stats":
      await interaction.reply({
        embeds: [loadingEmbed],
      });

      //TODO make a chart for ratios
      // const ratioStatistics = await prisma.ratio.findMany({});
      // const ratioParsed = ratioStatistics.map((ratio) => [
      //   SnowflakeUtil.deconstruct(ratio.id).date,
      //   ratio.likes,
      // ]);

      await interaction.editReply({
        embeds: [
          new MessageEmbed()
            .setColor("RANDOM")
            .setDescription(
              `**Ratio Statistics ${
                notGlobal ? `for ${interaction.guild.name}` : "Globally"
              }**\n**Ratios**: ${
                notGlobal
                  ? await getRatioCount(interaction.guild.id)
                  : await getRatioCount()
              }\n\n**Bot Statistics**\n **Guilds**: ${
                client.guilds.cache.size
              }\n **Users**: ${client.guilds.cache
                .map((g) => g.memberCount)
                .reduce((a, c) => a + c)}`
            )
            .setFooter({
              text: `Ratio Bot • Created by jonah#1234`,
            }),
        ],
        components: [voteRow],
      });

      break;
  }
});

client.on("messageReactionAdd", (reaction) => manageReaction(reaction));
client.on("messageReactionRemove", (reaction) => manageReaction(reaction));

const manageReaction = async (
  reaction: MessageReaction | PartialMessageReaction
) => {
  try {
    if (reaction.partial) await reaction.fetch();

    if (!emojiList.includes(`<:${reaction.emoji.name}:${reaction.emoji.id}>`))
      return;

    await prisma.ratio.update({
      where: { id: reaction.message.id },
      data: { likes: reaction.count },
    });
  } catch (e) {
    if (process.env.mode === "DEV") console.log(e);
    Sentry.captureException(e);
  }
};

client.login(process.env.TOKEN);
