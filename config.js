const defaultConfig = {
  destDir: __dirname + "/data/records",
  checkInterval: 60 * 1000,
  noDownload: false,
};

module.exports = Object.assign({}, defaultConfig, require("./config.local"));
