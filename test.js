const mongoose = require("mongoose");
const ratio = require("./src/schema");

const config = require("./config.json");

const main = async () => {
  const ratios = await ratio.find();
  const ratioList = [];

  for (const r of ratios) {

    ratioList.push({ likes: r.likes, author: r.author, related: r.related });
  }
  // console.log(ratioList);
  const lb = ratioList.sort((a, b) => b.likes - a.likes);
  console.log(lb);
};


main();
mongoose.connect(config.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
