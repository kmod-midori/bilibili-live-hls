const db = require("./db");
const api = require("./api");
const config = require("./config");
const logger = require("./logger");
const { startRecord } = require("./record");

async function check(room) {
  if (room.recording) {
    return;
  }

  let roomInfo = await api.getRoomInfo(room.roomId);
  room = await db.roomsDao.update(room.roomId, {
    lastChecked: new Date(),
    uname: roomInfo.uname,
    title: roomInfo.title,
  });

  if (roomInfo.live_status === 1) {
    startRecord(room);
  }
}

module.exports = async function monitor() {
  await db.roomsDao.resetState();
  let fn = async () => {
    let rooms = await db.roomsDao.findAll();
    let promises = [];
    for (const room of rooms) {
      promises.push(check(room));
    }

    try {
      await Promise.all(promises);
      logger.info("Check done");
    } catch (error) {
      logger.error("Check failed", error);
    }

    setTimeout(
      fn,
      config.checkInterval + Math.round(Math.random() * 30) * 1000
    );
  };
  fn();
};
