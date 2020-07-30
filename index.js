const { isLive } = require("./api");
const { startRecord } = require("./record");
const logger = require("./logger");
const config = require("./config");

const CHECK_INTERVAL = 30 * 1000;

async function loop() {
  let live = await isLive(config.roomId);
  if (!live) {
    logger.info("Not live");
    return;
  }

  logger.info("Live, starting record");
  await startRecord(config.roomId);
}

async function main() {
  let fn = async () => {
    try {
      await loop();
    } catch (error) {
      logger.error("Check failed", error);
    }
    setTimeout(fn, CHECK_INTERVAL);
  };
  fn();
}

main();
