const hls = require("hls-parser");
const logger = require("./logger");
const pathJoin = require("path").join;
const mkdirp = require("mkdirp");
const config = require("./config");
const notify = require("./notify");

const { axiosGet, sleep, downloadWithRetry } = require("./common");
const { getPlayUrl, isLive } = require("./api");
const db = require("./db");

async function loadAndParse(url) {
  let res = await axiosGet(url);
  let playlist = hls.parse(res.data);
  return playlist;
}

async function resolvePlaylist(url) {
  let playlist = await loadAndParse(url);

  if (playlist.segments) {
    return url;
  }

  if (playlist.variants) {
    let url = playlist.variants[0].uri;
    logger.info("Switching playlist URL to " + url);
    return resolvePlaylist(url);
  }

  throw new Error("Got invalid playlist");
}

async function record(room, recordDoc, url) {
  let lastSeqNumber = 0;
  let dirName = `${room.roomId}_${new Date().toISOString().replace(/:/g, "_")}`;

  let dirPath = pathJoin(config.dataDir, "records", dirName);
  await mkdirp(dirPath);

  await db.recordsDao.update(recordDoc._id, {
    dirName: dirName,
  });

  while (true) {
    let playlist = await loadAndParse(url);
    let host = new URL(url).host;

    for (const segment of playlist.segments) {
      const seqNumber = segment.mediaSequenceNumber;

      if (seqNumber > lastSeqNumber) {
        if (seqNumber - lastSeqNumber > 1) {
          logger.warn(`Skipped ${seqNumber - lastSeqNumber} segments!`);
        }

        let segmentUrl = `https://${host}${segment.uri}`;
        logger.debug(`[${seqNumber}] ${segmentUrl}`);
        lastSeqNumber = seqNumber;

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

async function recordLoop(room) {
  let url = await resolvePlaylist(await getPlayUrl(room.roomId));

  let recordDoc = {
    roomId: room.roomId,
    title: room.title,
    startTime: new Date(),
    playlistUrl: url,
  };
  recordDoc = await db.recordsDao.create(recordDoc);
  await db.roomsDao.update(room.roomId, {
    recording: true,
  });
  notify.sendStart(room);

  try {
    await record(room, recordDoc, url);
    notify.sendEnd(room);
  } catch (error) {
    await db.recordsDao.update(recordDoc._id, {
      error: error.stack || error.toString(),
    });
    notify.sendError(room, error);
    throw error;
  } finally {
    await db.recordsDao.update(recordDoc._id, {
      endTime: new Date(),
    });
    await db.roomsDao.update(room.roomId, {
      recording: false,
    });
  }
}

exports.startRecord = async function (room) {
  do {
    try {
      await recordLoop(room);
    } catch (error) {
      logger.error("Record loop failed", error);
    }
    await sleep(5 * 1000);
  } while (await isLive(room.roomId));
};
