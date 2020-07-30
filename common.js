const axios = require("axios");
const fs = require("fs");

const headers = {
  Referer: "https://live.bilibili.com/",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Mobile Safari/537.36",
};

exports.axiosGet = function axiosGet(url) {
  return axios.get(url, {
    headers,
  });
};

exports.sleep = function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), duration);
  });
};

exports.downloadFile = function downloadFile(url, output) {
  const writer = fs.createWriteStream(output);

  return axios({
    method: "GET",
    url,
    headers,
    responseType: "stream",
  }).then((response) => {
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on("error", (err) => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on("close", () => {
        if (!error) {
          resolve();
        }
        //no need to call the reject here, as it will have been called in the
        //'error' stream;
      });
    });
  });
};
