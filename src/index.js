const Discord = require("discord.js");
const client = new Discord.Client();

const config = require("../config.json");

client.on("ready", () => {
  console.log(`Logged in as: ${client.user.tag}`);
});

client.on("message", async (message) => {
  try {
    const content = message.content.toLowerCase();
    if (
      content.endsWith("+ ratio") ||
      content.endsWith("+ratio") ||
      content.endsWith("{+ ratio}") ||
      content.endsWith("(+ratio)") ||
      content.endsWith("ratio")
    ) {
      message.react("👍");
      let msg;

      if (message.reference)
        msg = await message.channel.messages.fetch(message.reference.messageID);
      else {
        const messages = await message.channel.messages.fetch({ limit: 30 });
        const messagesArray = Array.from(messages.values());

        for (let i = 0; i < messagesArray.length; i++)
          if (messagesArray[i].author.id !== message.author.id)
            return messagesArray[i].react("👍");
      }
    }
  } catch (e) {
    console.log(e);
  }
});

client.login(config.token);
