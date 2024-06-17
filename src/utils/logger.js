const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
require("dotenv").config();

/**
 * Logger 클래스
 * @class
 */
class Logger {
  /**
   * Logger 인스턴스를 생성합니다.
   * @constructor
   */
  constructor() {
    // 개발 모드인지 확인
    const isDevelopment = process.env.MODE === "development";

    // winston 로거 생성
    this.logger = winston.createLogger({
      // 로그 레벨 설정 (개발 모드에서는 debug, 그 외에는 info)
      level: isDevelopment ? "debug" : "info",
      // 로그 포맷 설정
      format: winston.format.combine(
        winston.format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss.SSS",
        }),
        winston.format.printf(({ level, timestamp, message }) => {
          return `[${level}] ${timestamp} | ${message}`;
        })
      ),
      // 로그 설정
      transports: [
        new DailyRotateFile({
          filename: `${process.cwd()}/log/%DATE%/default.log`,
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: "20m",
          maxFiles: "14d",
        }),
        // 콘솔에 로그 출력
        new winston.transports.Console({
          level: isDevelopment ? "debug" : "info",
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, timestamp, message }) => {
              return `[${level}] ${timestamp} | ${message}`;
            })
          ),
        }),
      ],
    });
  }

  /**
   * info 레벨 로그
   * @param {string} message - 로그 메시지
   */
  info(message) {
    this.logger.info(message);
  }

  /**
   * error 레벨 로그
   * @param {string|Error} message - 로그 메시지 또는 에러 객체
   */
  error(message) {
    this.logger.error(message instanceof Error ? message.stack : message);
  }

  /**
   * warn 레벨 로그
   * @param {string} message - 로그 메시지
   */
  warn(message) {
    this.logger.warn(message);
  }

  /**
   * debug 레벨 로그 (개발 모드에서만 동작)
   * @param {string} message - 로그 메시지
   */
  debug(message) {
    if (process.env.MODE === "development") {
      this.logger.debug(message);
    }
  }
}

module.exports = Logger;
