const hls = require("hls-parser");
const logger = require("./logger");
const pathJoin = require("path").join;
const mkdirp = require("mkdirp");
const config = require("./config");

const {
  axiosGet,
  sleep,
  downloadFile,
  downloadWithRetry,
} = require("./common");
const { getPlayUrl, isLive } = require("./api");

async function loadAndParse(url) {
  let res = await axiosGet(url);
  let playlist = hls.parse(res.data);
  return playlist;
}

async function resolveAndWaitForPlaylist(url) {
  let playlist;
  let lastError;

  for (let index = 0; index < 60; index++) {
    try {
      playlist = await loadAndParse(url);
      break;
    } catch (error) {
      logger.debug("Failed to load playlist, retrying...", error);
      lastError = error;
      await sleep(2000);
    }
  }
  if (!playlist) {
    throw lastError;
  }

  if (playlist.segments) {
    return url;
  }
  if (playlist.variants) {
    let url = playlist.variants[0].uri;
    logger.info("Switching playlist URL to " + url);
    return url;
  }
  throw new Error("Got invalid playlist");
}

async function record(url) {
  url = await resolveAndWaitForPlaylist(url);

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

        let destPath = pathJoin(dirPath, `${seqNumber}_${segment.duration}.ts`);

        if (!config.noDownload) {
          downloadWithRetry(segmentUrl, destPath).then(
            () => {
              logger.info(`Downloaded [${seqNumber}] => ${destPath}`);
            },
            (err) => {
              logger.error(`Failed to download [${seqNumber}]`, err);
            }
          );
        } else {
          logger.info(
            `Should download [${seqNumber}] => ${destPath}, but skipping`
          );
        }
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
    await sleep(5 * 1000);
  } while (await isLive(roomId));
};
