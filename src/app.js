////////////////////////////////////////////////////////////////////////////
// Mutil-Pacman Server
// Developed by Youbin Choi
// Edited 2024.06.11
/////////////////////////////////////////////////////////////////////////

const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const Logger = require("./utils/logger");
const logger = new Logger();
const initializeAllPools = require("./utils/database");
const app = express();

/**
 * 미들웨어 설정: morgan을 사용하여 HTTP 요청 로깅
 */
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.debug(message.trim()),
    },
  })
);

// JSON 요청 본문을 파싱하는 미들웨어 추가
app.use(express.json());

/**
 * JSON 파싱 에러 핸들링 미들웨어
 */
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    logger.error("[REQUEST] :: Invalid JSON format.");
    return res.status(400).json({ error: "Invalid JSON format" });
  }
  next();
});

/**
 * 데이터베이스 연결 풀 초기화
 */
initializeAllPools.then((dbPools) => {
  app.locals.dbPools = dbPools;

  /**
   * 라우터 핸들러: routes 디렉토리의 모든 라우트 파일을 불러와서 설정
   */
  fs.readdirSync(path.join(__dirname, "routes")).forEach((file) => {
    if (file.endsWith(".js")) {
      const route = require(`./routes/${file}`);
      const routePath = `/${file.replace(".js", "")}`;
      app.use(
        routePath,
        (req, res, next) => {
          req.dbPools = dbPools;
          next();
        },
        route
      );
      logger.debug(`[ROUTER] :: Route registered: [${routePath}] -> ${file}`);
    }
  });

  /**
   * Root 라우트 설정: 기본 경로에 대한 응답 설정
   * @route GET /
   * @returns {Object} 200 - 상태와 환영 메시지
   */
  app.get("/", (req, res) => {
    res
      .status(200)
      .json({ status: "OK", message: "Welcome to mutil-pacman server" });
  });

  /**
   * 404 에러 핸들링 미들웨어
   */
  app.use((req, res, next) => {
    res.status(404).json({ error: "Not Found" });
  });

  /**
   * 서버 실행: 지정된 포트에서 서버를 실행
   */
  app.listen(process.env.PORT, () => {
    logger.info(`[SERVER] :: Server is running on port ${process.env.PORT}`);
  });
});
