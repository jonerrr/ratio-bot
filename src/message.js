const fs = require("fs");

const words = ["+ratio", "(+ratio)", "ratio", "(ratio)"];

const exec = async (message, client) => {
  if (message.author.bot) return;

  const body = message.content.toLowerCase().split(" ");
  const start = body.slice(0, 2);
  const end = body.slice(Math.max(body.length - 2)).pop();

  if (
    words.includes(start[0]) ||
    words.includes(start.join("")) ||
    words.includes(end)
  ) {
    message.react("❤️");

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
      return reference.react("❤️");
    }

    const fetchMessages = await message.channel.messages.fetch({
      cache: true,
      limit: 50,
    });
    const messages = Array.from(fetchMessages.values());

    if (message.mentions.users.size) {
      const mentions = [];
      message.mentions.users.forEach((user) => {
        if (user.id !== message.author.id) mentions.push(user.id);
      });

      messages.forEach((msg) => {
        if (mentions.includes(msg.author.id)) {
          msg.react("❤️");
          mentions.splice(mentions.indexOf(msg.author.id), 1);
        }
      });
      return;
    }

    for (const msg of messages)
      if (msg.author.id !== message.author.id) return msg.react("❤️");
  }
};

module.exports = exec;
