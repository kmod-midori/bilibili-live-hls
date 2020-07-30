const hls = require("hls-parser");
const logger = require("./logger");
const pathJoin = require("path").join;
const mkdirp = require("mkdirp");
const config = require("./config");

const { axiosGet, sleep, downloadFile } = require("./common");
const { getPlayUrl, isLive } = require("./api");

async function loadAndParse(url) {
  let res = await axiosGet(url);
  let playlist = hls.parse(res.data);
  return playlist;
}

async function record(url) {
  let lastPlaylist = null;
  let maxSeqNumber = 0;
  let dirName = `${config.roomId}_${new Date()
    .toISOString()
    .replace(/:/g, "_")}`;
  let dirPath = pathJoin(config.destDir, dirName);
  await mkdirp(dirPath);

  while (true) {
    let playlist = await loadAndParse(url);
    let host = new URL(url).host;

    for (const segment of playlist.segments) {
      const seqNumber = segment.mediaSequenceNumber;

      if (seqNumber > maxSeqNumber) {
        if (seqNumber - maxSeqNumber > 1) {
          logger.warn(`Skipped ${seqNumber - maxSeqNumber} segments!`);
        }

        let segmentUrl = `https://${host}${segment.uri}`;
        logger.debug(`[${seqNumber}] ${segmentUrl}`);
        maxSeqNumber = seqNumber;

        let destPath = pathJoin(dirPath, `${seqNumber}.ts`);

        downloadFile(segmentUrl, destPath).then(
          () => {
            logger.debug(`Downloaded [${seqNumber}] => ${destPath}`);
          },
          (err) => {
            logger.error(`Failed to download [${seqNumber}]`, err);
          }
        );
      }
    }

    if (playlist.endlist) {
      break;
    } else {
      lastPlaylist = playlist;
      await sleep(playlist.targetDuration * 1000);
    }
  }
}

async function recordLoop(roomId) {
  let url = await getPlayUrl(roomId);
  logger.info("Playlist URL: " + url);

  await record(url);
}

exports.startRecord = async function (roomId) {
  do {
    try {
      await recordLoop(roomId);
      logger.info("Record loop exited w/o errors");
    } catch (error) {
      logger.error("Record loop failed", error);
    }
    sleep(5 * 1000);
  } while (await isLive(roomId));
};
