import {
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  MessageEmbed,
  MessageSelectOptionData,
} from "discord.js";
import { prisma } from "./index";
import emojis from "../emojis.json";

export let numberEmojis: string[] = [
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
export const emojiList: string[] = Object.keys(emojis).map((e) => emojis[e]);

export const voteRow = new MessageActionRow().addComponents(
  new MessageButton()
    .setLabel("Vote")
    .setStyle("LINK")
    .setURL(process.env.VOTE_URL)
);

const menuOptions: MessageSelectOptionData[] = Object.keys(emojis).map((e) => {
  return {
    label: `${e.toLowerCase()}`,
    value: e,
    emoji: emojis[e],
  };
});

export const chooseEmojiRow = (user: string): MessageActionRow =>
  new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId(`emoji_${user}`)
      .setMinValues(1)
      .setMaxValues(menuOptions.length)
      .setPlaceholder(`Click Here`)
      .addOptions(menuOptions)
  );

export const loadingEmbed = new MessageEmbed()
  .setFooter({
    iconURL: "https://cdn.discordapp.com/emojis/842457150110040144.gif",
    text: "Loading",
  })
  .setColor("YELLOW");

export const md = "`";

export const getRatioCount = async (serverId?: string): Promise<number> =>
  serverId
    ? Math.trunc((await prisma.ratio.count({ where: { serverId } })) / 2)
    : Math.trunc((await prisma.ratio.count()) / 2);

export const checkUser = async (
  id: string,
  all: boolean
): Promise<string | string[]> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.voteExpire < Date.now())
    return all ? [emojis.RED] : emojis.RED;

  const emojiArr = user.emojis.map((e) => emojis[e]);

  return all ? emojiArr : emojiArr[Math.floor(Math.random() * emojiArr.length)];
};
