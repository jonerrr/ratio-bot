const Discord = require("discord.js");
const client = new Discord.Client();

const config = require("../config.json");
const parseReaction = require("./reaction");
const parseMessage = require("./message");

client.on("ready", () =>
  console.log(
    `Connected to Gateway\nDiscord Tag: ${client.user.tag}\nDiscord ID: ${client.user.id}\n`
  )
);

client.on("raw", (packet) => parseReaction(packet, client));

client.on("message", (message) => parseMessage(message, client));

client.on("messageUpdate", (oldMessage, newMessage) =>
  parseMessage(newMessage, client)
);

client.login(config.token);
