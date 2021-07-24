const emojis = require("emojis");

const ratio = require("./schema");

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

const lb = async () => {
  const likes1 = await ratio.find({ message1Likes: { $gt: 1 } });
  const likes2 = await ratio.find({ message1Likes: { $gt: 1 } });
};

module.exports = { save, update, lb };
