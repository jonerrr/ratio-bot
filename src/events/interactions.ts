import { Emojis } from "@prisma/client";
import { Interaction, MessageEmbed } from "discord.js";
import {
  checkUser,
  chooseEmojiRow,
  emojiList,
  getRatioCount,
  loadingEmbed,
  md,
  numberEmojis,
  voteRow,
} from "../util";
import emojis from "../../emojis.json";
import { prisma } from "../index";

export const manageInteraction = async (
  interaction: Interaction,
  guildCount: number,
  userCount: number
) => {
  if (interaction.isSelectMenu()) {
    const data = interaction.customId.split("_");
    await prisma.user.update({
      where: { id: data[1] },
      data: {
        emojis: [...new Set(interaction.values as Emojis[])],
        customEmoji: null,
      },
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
      const user = await prisma.user.findFirst({
        where: { id: interaction.user.id, voteExpire: { gte: Date.now() } },
      });

      if (!user)
        return interaction.reply({
          embeds: [
            new MessageEmbed()
              .setFooter({
                text: "You need to vote to use this command!",
                iconURL:
                  "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/282/prohibited_1f6ab.png",
              })
              .setColor("RANDOM"),
          ],
          components: [voteRow],
          ephemeral: true,
        });

      const customEmoji = interaction.options.getString("emoji");

      if (customEmoji && customEmoji.match(/(<a?)?:\w+:(\d{18}>)?/g)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { customEmoji },
        });
        return await interaction.reply({
          embeds: [
            new MessageEmbed()
              .setFooter({
                text: "Emoji Updated!",
                iconURL:
                  "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/282/check-mark-button_2705.png",
              })
              .setColor("RANDOM"),
          ],
          ephemeral: true,
        });
      }

      return await interaction.reply({
        embeds: [
          new MessageEmbed()
            .setTitle("Set Emoji Color")
            .setDescription(
              `Currently selected emoji(s):\n${
                user.customEmoji
                  ? user.customEmoji
                  : user.emojis.map((e) => emojis[e]).join("")
              }`
            )
            .setColor("RANDOM"),
        ],
        components: [chooseEmojiRow(interaction.user.id)],
        ephemeral: true,
      });

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
              }\n\n**Bot Statistics**\n **Guilds**: ${guildCount}\n **Users**: ${userCount}`
            )
            .setFooter({
              text: `Ratio Bot • Created by jonah#1234`,
            }),
        ],
        components: [voteRow],
      });
      break;
  }
};
