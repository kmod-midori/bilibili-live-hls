const Datastore = require("nedb-promises");
const rooms = Datastore.create(__dirname + "/rooms.db");
const records = Datastore.create(__dirname + "/records.db");

let roomsDao = {
  findAll() {
    return rooms.find({});
  },
  findById(roomId) {
    return rooms.findOne({ roomId });
  },
  async create(roomId) {
    let room = await roomsDao.findById(roomId);
    if (room) {
      return room;
    }
    room = await rooms.insert({
      roomId,
    });
    return room;
  },
  update(roomId, update) {
    return rooms.update(
      { roomId },
      { $set: update },
      {
        returnUpdatedDocs: true,
      }
    );
  },
  resetState() {
    return rooms.update({}, { $set: { recording: false } });
  },
};

let recordsDao = {
  findAll() {
    return records.find({});
  },
  update(id, update) {
    return records.update(
      { _id: id },
      { $set: update },
      {
        returnUpdatedDocs: true,
      }
    );
  },
  create(doc) {
    return records.insert(doc);
  },
};

module.exports = {
  rooms,
  roomsDao,
  records,
  recordsDao,
};
