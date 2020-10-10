const restify = require("restify");
const db = require("./db");
const config = require("./config");

const server = restify.createServer();
server.use(restify.plugins.queryParser());

const wrap = function (fn) {
  return function (req, res, next) {
    return fn(req, res, next).catch(function (err) {
      return next(err);
    });
  };
};

server.get(
  "/room",
  wrap(async function (req, res, next) {
    let rooms = await db.roomsDao.findAll();
    res.send(rooms);
    next();
  })
);
server.get(
  "/room/add",
  wrap(async function (req, res, next) {
    let roomId = parseInt(req.query.id, 10);

    let room = await db.roomsDao.create(roomId);
    res.send(room);
    next();
  })
);

server.get(
  "/record",
  wrap(async function (req, res, next) {
    let records = await db.recordsDao.findAll();
    res.send(records);
    next();
  })
);

server.listen(config.apiPort, function () {
  console.log("%s listening at %s", server.name, server.url);
});

require("./monitor")();
