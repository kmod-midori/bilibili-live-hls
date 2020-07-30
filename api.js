const { axiosGet } = require("./common");

exports.getPlayUrl = async function getPlayUrl(roomId) {
  let res = await axiosGet(
    `https://api.live.bilibili.com/xlive/web-room/v1/playUrl/playUrl?cid=${roomId}&platform=h5&otype=json&qn=10000`
  );
  return res.data.data.durl[0].url;
};

exports.getRoomInfo = async function getRoomInfo(roomId) {
  let res = await axiosGet(
    `https://api.live.bilibili.com/xlive/web-room/v1/index/getRoomBaseInfo?&platform=h5&room_ids=${roomId}&&req_biz=live-h5`
  );
  return res.data.data.by_room_ids[roomId];
};

exports.isLive = async function isLive(roomId) {
  let res = await exports.getRoomInfo(roomId);
  return res.live_status === 1;
};
