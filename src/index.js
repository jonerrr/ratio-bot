const Discord = require("discord.js");
const client = new Discord.Client();

const config = require("../config.json");

client.on("ready", () => {
  console.log(`Logged in as: ${client.user.tag}`);
});

client.on("message", async (message) => {
  try {
    if (
      message.content.endsWith("+ ratio") ||
      message.content.endsWith("+ratio") ||
      message.content.endsWith("{+ ratio}") ||
      message.content.endsWith("(+ratio)")
    ) {
      message.react("👍");
      const messages = await message.channel.messages.fetch({ limit: 2 });
      const msg = Array.from(messages.values())[1];
      msg.react("👍");
    }
  } catch (e) {
    console.log(e);
  }
});

client.login(config.token);
