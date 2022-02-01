import {
  Client,
  Intents,
  Message,
  MessageEmbed,
  MessageReaction,
  PartialMessageReaction,
  SnowflakeUtil,
} from "discord.js";
import { chart } from "highcharts";
import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import * as Sentry from "@sentry/node";
import { Routes } from "discord-api-types/v9";
import { PrismaClient } from "@prisma/client";
import { Api } from "@top-gg/sdk";
import { config } from "dotenv";

config();
import { numberEmojis, votedEmojis, voteRow, md, loadingEmbed } from "./util";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.25,
});
const topGG = new Api(process.env.TOPGG_TOKEN);
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});
const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);
const prisma = new PrismaClient();

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
  if (
    message.author.bot ||
    message.content.match(/(?:^|\W)ratio(?:$|\W)/gim).length === 0
  )
    return;

  try {
    const emoji: string = (await topGG.hasVoted(message.author.id))
      ? votedEmojis[Math.floor(Math.random() * votedEmojis.length)]
      : process.env.EMOJI;

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
          name: `${(await prisma.ratio.count()) / 2} ratios`,
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
  if (!interaction.isCommand()) return;

  switch (interaction.commandName) {
    case "leaderboard":
      await interaction.reply({
        embeds: [loadingEmbed],
      });

      const operation: any = {
        orderBy: { likes: "desc" },
        take: 10,
      };

      if (!interaction.options.getBoolean("global") && interaction.inGuild())
        operation.where = { serverId: interaction.guild.id };
      const ratios = await prisma.ratio.findMany(operation);

      let desc = "";
      for (let i = 0; i < ratios.length; i++) {
        const related = await prisma.ratio.findUnique({
          where: { id: ratios[i].related },
        });
        desc += `${numberEmojis[i]} ${ratios[i].username} ${process.env.EMOJI}**${ratios[i].likes}** ${md}≥${md} ${related.username} ${process.env.EMOJI}**${related.likes}**\n\n`;
      }

      await interaction.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle(
              `Ratio Leaderboard ${
                !interaction.options.getBoolean("global") &&
                interaction.inGuild()
                  ? `(${interaction.guild.name})`
                  : "(global)"
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
        embeds: [
          new MessageEmbed()
            .setDescription("Loading <a:loading:921882048216576020>")
            .setColor("YELLOW"),
        ],
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
            .setTitle(
              `Ratio Statistics ${
                !interaction.options.getBoolean("global") &&
                interaction.inGuild()
                  ? `(${interaction.guild.name})`
                  : "(global)"
              }`
            )
            .setColor("RANDOM")
            .setDescription(
              `${
                !interaction.options.getBoolean("global") &&
                interaction.inGuild()
                  ? (await prisma.ratio.count({
                      where: { serverId: interaction.guild.id },
                    })) / 2
                  : (await prisma.ratio.count()) / 2
              } ratios\n\n*More statistics coming soon*`
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

    if (
      ![process.env.EMOJI, ...votedEmojis].includes(
        `<:${reaction.emoji.name}:${reaction.emoji.id}>`
      )
    )
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
