const axios = require("axios");
const crypto = require("crypto");
const config = require("./config");

async function notify(content) {
  if (!config.dingtalk) {
    return;
  }
  let timestamp = (+new Date()).toString();
  let signStr = timestamp + "\n" + config.dingtalk.key;
  let sign = crypto
    .createHmac("sha256", config.dingtalk.key)
    .update(signStr)
    .digest("base64");

  try {
    await axios.post(config.dingtalk.url, content, {
      params: {
        timestamp,
        sign,
      },
    });
  } catch (e) {
    console.log(e);
  }
}

exports.sendStart = function (room) {
  notify({
    msgtype: "text",
    text: {
      content: `[录制开始]\n已开始录制${room.uname}的直播间${room.roomId}，当前标题为${room.title}。`,
    },
  });
};

exports.sendEnd = function (room) {
  notify({
    msgtype: "text",
    text: {
      content: `[录制结束]\n${room.uname}的直播间${room.roomId}，，本次录制已正常结束。`,
    },
  });
};

exports.sendError = function (room, error) {
  notify({
    msgtype: "text",
    text: {
      content: `[录制出错]\n${room.uname}的直播间${
        room.roomId
      }，本次录制出现错误。\n${error.stack || error}`,
    },
  });
};
