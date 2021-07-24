const queries = require("./queries");
const eventsArr = ["MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE"];
const eventsObj = {
  MESSAGE_REACTION_ADD: 1,
  MESSAGE_REACTION_REMOVE: -1,
};

const exec = async (packet, client) => {
  if (
    !eventsArr.includes(packet.t) ||
    !packet.d.emoji ||
    packet.d.emoji.id !== "868566740718719017" ||
    (packet.d.member && packet.d.member.user.id === client.user.id)
  )
    return;

  await queries.update(packet.d.message_id, eventsObj[packet.t]);
};

module.exports = exec;
