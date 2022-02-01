import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

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
export const votedEmojis: string[] = process.env.VOTED_EMOJIS.split(",");

export const voteRow = new MessageActionRow().addComponents(
  new MessageButton()
    .setLabel("Vote")
    .setStyle("LINK")
    .setURL(process.env.VOTE_URL)
);

export const loadingEmbed = new MessageEmbed()
  .setDescription("Loading <a:loading:921882048216576020>")
  .setColor("YELLOW");

export const md = "`";
