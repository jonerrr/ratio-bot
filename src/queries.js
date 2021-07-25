const emojis = require("emojis");
const { MessageEmbed } = require("discord.js");

const ratio = require("./schema");
const numbers = {
  0: ":one:",
  1: ":two:",
  2: ":three:",
  3: ":four:",
  4: ":five:",
  5: ":six:",
  6: ":seven:",
  7: ":eight:",
  8: ":nine:",
  9: ":keycap_ten:",
};

const parse = (content) => {
  const parsedEmojis = emojis.unicode(content);
  const contentArr = parsedEmojis.split(" ");
  let parsed = "";

  for (const word of contentArr) {
    if (!word.match(/(?<=<)(.*?)(?=>)/)) parsed = `${parsed} ${word}`;
  }

  return parsed;
};

const save = async (msg1, msg2) =>
  await new ratio({
    message1: msg1.id,
    message1Owner: {
      username: msg1.author.username,
      avatar: msg1.author.avatar
        ? `https://cdn.discordapp.com/avatars/${msg1.author.id}/${msg1.author.avatar}`
        : `https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png`,
      content: parse(msg1.content),
    },

    message2: msg2.id,
    message2Owner: {
      username: msg2.author.username,
      avatar: msg2.author.avatar
        ? `https://cdn.discordapp.com/avatars/${msg2.author.id}/${msg2.author.avatar}`
        : `https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png`,
      content: parse(msg2.content),
    },
  }).save();

const update = async (id, likes) => {
  let message1 = true;
  let data = await ratio.findOne({ message1: id });
  if (!data) {
    data = await ratio.findOne({ message2: id });
    message1 = false;
  }

  message1
    ? await ratio.updateOne(
        { _id: data._id },
        { message1Likes: data.message1Likes + likes }
      )
    : await ratio.updateOne(
        { _id: data._id },
        { message2Likes: data.message2Likes + likes }
      );
};

const md = "`";
let cacheExpire = Date.now() + 300000;
let cache;

const lb = async () => {
  let ratios = cache;

  if (cacheExpire < Date.now() || !cache) {
    ratios = await ratio.find();
    cache = ratios;
  }

  const likesArray = [];

  for (const r of ratios) {
    likesArray.push({
      username: r.message1Owner.username,
      avatar: r.message1Owner.avatar,
      likes: r.message1Likes,
      tim: r.time,
      reference: {
        username: r.message2Owner.username,
        avatar: r.message2Owner.avatar,
        likes: r.message2Likes,
      },
    });
    likesArray.push({
      username: r.message2Owner.username,
      likes: r.message2Likes,
      tim: r.time,
      reference: {
        username: r.message1Owner.username,
        likes: r.message1Likes,
      },
    });
  }

  likesArray.sort((a, b) => b.likes - a.likes);

  const embed = new MessageEmbed()
    .setTitle("Ratio Leaderboard")
    .setColor("#5049dd");

  for (i = 0; i < 10; i++)
    embed.addField(
      `${numbers[i]} ${likesArray[i].username}: ${likesArray[i].likes} like${
        likesArray[i].likes > 1 ? "s" : ""
      }`,
      `${likesArray[i].reference.username}: ${
        likesArray[i].reference.likes
      } like${likesArray[i].likes > 1 ? "s" : ""}`
    );

  return embed;
};

module.exports = { save, update, lb };
