const fs = require("fs");
const config = require("../config.json");
const queries = require("./queries");

const words = [
  "+ratio",
  "+ ratio",
  "(+ratio)",
  "ratio",
  "(ratio)",
  "(+ ratio)",
  "+ratio",
];

const check = (content) => {
  for (const word of words)
    if (content.startsWith(word) || content.endsWith(word)) return true;
};

const exec = async (message, client) => {
  if (message.author.bot) return;

  if (
    message.content.toLowerCase() === "+lb" ||
    message.content.toLowerCase() === "+leaderboard"
  )
    return message.channel.send(await queries.lb());

  if (check(message.content.toLowerCase())) {
    message.react(config.emoji);

    let count = parseInt(fs.readFileSync("./count.txt"));
    count++;
    fs.writeFileSync("./count.txt", count.toString());

    client.user.setPresence({
      status: "idle",
      activity: {
        name: `${count} ratios`,
        type: "WATCHING",
      },
    });

    if (message.reference) {
      const reference = await message.channel.messages.fetch(
        message.reference.messageID
      );

      reference.react(config.emoji);
      return await queries.save(message, reference);
    }

    const fetchMessages = await message.channel.messages.fetch({
      cache: true,
      limit: 50,
    });
    const messages = Array.from(fetchMessages.values());

    for (const msg of messages)
      if (
        (message.mentions.users.size &&
          message.mentions.users.first().id === msg.author.id) ||
        (!message.mentions.users.size && msg.author.id !== message.author.id)
      ) {
        msg.react(config.emoji);
        return await queries.save(message, msg);
      }
  }
};

module.exports = exec;
