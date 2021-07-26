const emojis = require("emojis");
const { nanoid } = require("nanoid");
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

const save = async (msg1, msg2) => {
  const _id = [nanoid(), nanoid()];

  await new ratio({
    _id: _id[0],
    likes: 1,
    content: parse(msg1.content),
    message: msg1.id,
    author: msg1.author,
    link: msg1.url,
    related: _id[1],
  }).save();
  await new ratio({
    _id: _id[1],
    likes: 1,
    content: parse(msg2.content),
    message: msg2.id,
    author: msg2.author,
    link: msg2.url,
    related: _id[0],
  }).save();
};

const update = async (id, likes) => {
  const r = await ratio.findOne({ message: id });
  await ratio.updateOne({ _id: r._id }, { likes: r.likes + likes });
};

let cacheExpire = Date.now() + 300000;
let cache;

const lb = async () => {
  return "coming back soon";
  let ratios = cache;

  if (cacheExpire < Date.now() || !cache) {
    ratios = await ratio.find();
    cache = ratios;
  }

  const ratiosObj = {};

  ratios.sort((a, b) => b.likes - a.likes);

  ratios.forEach((r) => (ratiosObj[r._id] = r));

  console.log(ratiosObj);

  // const embed = new MessageEmbed()
  //   .setTitle("Ratio Leaderboard")
  //   .setColor("#5049dd");

  // for (i = 0; i < 10; i++)
  //   embed.addField(
  //     `${numbers[i]} ${likesArray[i].username}: ${likesArray[i].likes} like${
  //       likesArray[i].likes > 1 ? "s" : ""
  //     }`,
  //     `${likesArray[i].reference.username}: ${
  //       likesArray[i].reference.likes
  //     } like${likesArray[i].likes > 1 ? "s" : ""}`
  //   );

  return "ok";
};

module.exports = { save, update, lb };
