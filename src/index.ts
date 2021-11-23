import {
  Client,
  Intents,
  Message,
  MessageEmbed,
  MessageReaction,
  PartialMessageReaction,
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
config();

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
});
const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);
const prisma = new PrismaClient();

const words = [
  "+ratio",
  "+ ratio",
  "(+ratio)",
  "ratio",
  "(ratio)",
  "(+ ratio)",
  "+ratio",
];
let count: number = Date.now();

client.on("ready", async () => {
  await prisma.$connect();
  console.log(`Logged in as ${client.user.tag}\nMode: ${process.env.MODE}`);

  client.user.setPresence({
    status: "dnd",
  });

  const commands = [
    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("Ratio Leaderboard")
      .addBooleanOption((option) =>
        option.setName("global").setDescription("Get global leaderboard")
      ),
  ].map((command) => command.toJSON());

  process.env.MODE === "DEV"
    ? await rest.put(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD),
        { body: commands }
      )
    : await rest.put(Routes.applicationCommands(client.user.id), {
        body: commands,
      });
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  for (const word of words)
    if (
      message.content.toLowerCase().startsWith(word) &&
      message.content.toLowerCase().endsWith(word)
    ) {
      await message.react(process.env.EMOJI);

      let msg: Message;

      if (message.reference)
        msg = await message.channel.messages.fetch(message.reference.messageId);

      if (!msg) {
        const msgs: Message[] = Array.from(
          (await message.channel.messages.fetch()).values()
        );

        for (const m of msgs) {
          if (
            (message.mentions.users.size &&
              message.mentions.users.first().id === m.author.id) ||
            (!message.mentions.users.size && m.author.id !== message.author.id)
          ) {
            msg = m;
            break;
          }
        }
      }
      await msg.react(process.env.EMOJI);

      await prisma.ratio.createMany({
        data: [
          {
            id: message.id,
            userId: message.author.id,
            serverId: message.guild.id,
            username: message.author.username,
            related: msg.id,
          },
          {
            id: msg.id,
            userId: msg.author.id,
            serverId: msg.guild.id,
            username: msg.author.username,
            related: message.id,
          },
        ],
      });
    }

  if (count > Date.now()) return;
  client.user.setPresence({
    status: "idle",
    activities: [
      { name: `${(await prisma.ratio.count()) / 2} ratios`, type: "WATCHING" },
    ],
  });
  count = Date.now() + 60000;
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "leaderboard") {
    const where: any = {};
    if (interaction.options.getBoolean("Global"))
      where.serverId = interaction.guild.id;

    // const ratios = await prisma.ratio.findMany({
    //   where,
    //   orderBy: { likes: "desc" },
    // });

    // console.log(ratios);

    await interaction.reply({
      embeds: [
        new MessageEmbed()
          .setTitle("Ratio Leaderboard")
          .setDescription("```Coming Soon```"),
      ],
    });
  }
});

client.on("messageReactionAdd", (reaction) => manageReaction(reaction, 1));
client.on("messageReactionRemove", (reaction) => manageReaction(reaction, 0));

const manageReaction = async (
  reaction: MessageReaction | PartialMessageReaction,
  type: number
) => {
  if (
    `<:${reaction.emoji.name}:${reaction.emoji.id}>` !== process.env.EMOJI ||
    reaction.count === 1
  )
    return;

  if (reaction.partial) reaction = await reaction.fetch();

  await prisma.ratio.update({
    where: { id: reaction.message.id },
    data: { likes: reaction.count },
  });
};

client.login(process.env.TOKEN);
