import {
  Client,
  WebhookClient,
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
import { Api } from "@top-gg/sdk";
import { config } from "dotenv";
config();

const topGG = new Api(process.env.TOPGG_TOKEN);
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
});
const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_URL });
const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);
const prisma = new PrismaClient();

let emojis: string[] = [
  ":one:",
  ":two:",
  ":three:",
  ":four:",
  ":five:",
  ":six:",
  ":seven:",
  ":eight:",
  ":nine:",
  ":keycap_ten:",
];
const md = "`";
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
  if (message.author.bot || !message.content.toLowerCase().includes("ratio"))
    return;

  const content = message.content.toLowerCase().split(" ");

  if (content[0] !== "ratio" && content.pop() !== "ratio") return;

  try {
    //(maybe) random colored heart emoji if voted
    const emoji: string = (await topGG.hasVoted(message.author.id))
      ? process.env.VOTED_EMOJI
      : process.env.EMOJI;

    await message.react(emoji);
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
    await msg.react(emoji);

    await prisma.ratio.createMany({
      data: [
        {
          id: message.id,
          userId: message.author.id,
          serverId: message.guild.id,
          username: message.author.username,
          expire: Date.now() + 2592000000,
          related: msg.id,
        },
        {
          id: msg.id,
          userId: msg.author.id,
          serverId: msg.guild.id,
          username: msg.author.username,
          expire: Date.now() + 2592000000,
          related: message.id,
        },
      ],
    });

    // const guildCheck: string[] = JSON.parse(
    //   readFileSync("./servers.json").toString()
    // );

    // if (
    //   !message.guild.me.permissions.has("USE_APPLICATION_COMMANDS") &&
    //   !guildCheck.includes(message.guild.id)
    // ) {
    //   await message.channel.send({
    //     embeds: [
    //       new MessageEmbed()
    //         .setTitle("Warning")
    //         .setColor("DARK_RED")
    //         .setDescription(
    //           `Slash commands are disabled for the bot in this server! Without them, you cannot check ratio leaderboards. To enable slash commands, just reinvite the bot.`
    //         )
    //         .setFooter("This is a one time message"),
    //     ],
    //   });
    //   guildCheck.push(message.guild.id);
    //   writeFileSync("./servers.json", JSON.stringify(guildCheck));
    // }

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
    console.log(e);
    webhookClient.send({
      content: `THERE WAS AN ERROR!!!!!!!!!!!!!!!!!!!!`,
      embeds: [
        new MessageEmbed()
          .setTitle("ERROR")
          .setDescription(e.message)
          .setColor("RED"),
      ],
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand() && interaction.commandName === "leaderboard") {
    await interaction.reply({
      embeds: [
        new MessageEmbed().setDescription(
          "Loading <a:loading:921882048216576020"
        ),
      ],
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
      desc += `${emojis[i]} ${ratios[i].username} ${process.env.EMOJI}**${ratios[i].likes}** ${md}≥${md} ${related.username} ${process.env.EMOJI}**${related.likes}**\n\n`;
    }

    await interaction.editReply({
      embeds: [
        new MessageEmbed()
          .setTitle("Ratio Leaderboard")
          .setColor("RANDOM")
          .setDescription(
            desc === "" ? "There are no ratios in this server." : desc
          )
          .setFooter(`Ratio Bot • Created by jonah#1234`),
      ],
    });
  }
});

client.on("messageReactionAdd", (reaction) => manageReaction(reaction));
client.on("messageReactionRemove", (reaction) => manageReaction(reaction));

const manageReaction = async (
  reaction: MessageReaction | PartialMessageReaction
) => {
  if (
    [process.env.EMOJI, process.env.VOTED_EMOJI].includes(
      `<:${reaction.emoji.name}:${reaction.emoji.id}>`
    ) ||
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
