const { createLogger, format, transports } = require("winston");
const { combine, timestamp } = format;

const logger = createLogger({
  level: "debug",
  format: combine(timestamp(), format.json()),
  transports: [
    new transports.File({ filename: "error.log", level: "error" }),
    new transports.File({ filename: "combined.log", level: "info" }),
    new transports.Console({
      format: combine(timestamp(), format.simple())
    }),
  ],
});

module.exports = logger;
