const pathJoin = require("path").join;

const defaultConfig = {
  dataDir: pathJoin(__dirname, "data"),
  checkInterval: 60 * 1000,
  noDownload: false,
  apiPort: 8080
};

module.exports = Object.assign({}, defaultConfig, require("./config.local"));
