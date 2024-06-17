const express = require("express");
const mariadb = require("mariadb");
const Logger = require("../utils/logger");
const logger = new Logger();
const router = express.Router();

/**
 * 요청 에러 코드
 */
const CATCH_REQUEST_PREFIX = "[REQUEST]";
const CATCH_INVALID_DATA_CODE = 400;

/**
 * 데이터베이스 에러 코드
 */
const CATCH_DATABASE_PREFIX = "[DATABASE]";
const CATCH_DATABASE_CONN_CODE = 521;
const CATCH_DATABASE_QUERY_CODE = 522;

/**
 * 데이터 검증 미들웨어
 */
const validateData = (req, res, next) => {
  const { game_id, player_id, score, duration } = req.body;

  if (!game_id || typeof game_id !== "string" || game_id.trim() === "") {
    logger.warn(`${CATCH_REQUEST_PREFIX} :: Invalid game_id.`);
    return res
      .status(CATCH_INVALID_DATA_CODE)
      .json({ error: "Invalid game_id" });
  }

  if (game_id.length > 255) {
    logger.warn(`${CATCH_REQUEST_PREFIX} :: game_id length exceeds limit.`);
    return res
      .status(CATCH_INVALID_DATA_CODE)
      .json({ error: "game_id length exceeds limit" });
  }

  if (!player_id || typeof player_id !== "string" || player_id.trim() === "") {
    logger.warn(`${CATCH_REQUEST_PREFIX} :: Invalid player_id.`);
    return res
      .status(CATCH_INVALID_DATA_CODE)
      .json({ error: "Invalid player_id" });
  }

  if (score == null || typeof score !== "number" || score < 0) {
    logger.warn(`${CATCH_REQUEST_PREFIX} :: Invalid score.`);
    return res.status(CATCH_INVALID_DATA_CODE).json({ error: "Invalid score" });
  }

  if (duration == null || typeof duration !== "number" || duration < 0) {
    logger.warn(`${CATCH_REQUEST_PREFIX} :: Invalid duration.`);
    return res
      .status(CATCH_INVALID_DATA_CODE)
      .json({ error: "Invalid duration" });
  }

  next();
};

/**
 * @route POST /saveData
 * @description Save data to the server
 * @access Public
 */
router.post("/", validateData, async (req, res) => {
  const { game_id, player_id, score, duration } = req.body;
  const dbPools = req.dbPools;

  let connection;
  try {
    /**
     * 데이터베이스 연결
     * @returns {object} connection - 데이터베이스 연결 객체
     */
    connection = await dbPools.game.getConnection();

    /**
     * 데이터베이스 연결 실패 처리
     */
    if (!connection) {
      logger.error(
        `${CATCH_DATABASE_PREFIX} :: Failed to establish a database connection.`
      );
      return res
        .status(CATCH_DATABASE_CONN_CODE)
        .json({ error: "Database connection failed." });
    }

    try {
      /**
       * sp_create_game 프로시저 호출
       * @param {string} game_id - 게임 ID
       * @param {string} player_id - 플레이어 ID
       * @param {number} score - 점수
       * @param {number} duration - 게임 시간
       */
      await connection.query(
        "CALL sp_create_game(?, ?, ?, ?, @result, @result2);",
        [game_id, player_id, score, duration]
      );

      /**
       * 결과 조회
       */
      const [rows] = await connection.query("SELECT @result, @result2;");
      const result = Number(rows["@result"]);
      const result2 = rows["@result2"];

      // 결과에 따른 응답 처리
      switch (result) {
        // 게임 데이터 저장 성공
        case 200:
          logger.info(
            `${CATCH_DATABASE_PREFIX} :: Game data saved successfully.`
          );
          res.status(200).json({ message: result2 });
          break;
        // 게임 데이터 저장 실패
        case 400:
        case 409:
          logger.warn(
            `${CATCH_DATABASE_PREFIX} :: Game data not saved. Reason: ${result2}`
          );
          res.status(400).json({ error: result2 });
          break;
        // 데이터베이스 에러
        case -101:
          logger.error(
            `${CATCH_DATABASE_PREFIX} :: Database SQL Exception occurred. Reason: ${result2}`
          );
          res.status(500).json({ error: result2 });
          break;
        default:
          // 알 수 없는 오류
          logger.error(
            `${CATCH_DATABASE_PREFIX} :: Game data not saved for unknown reasons. Reason: ${result2}`
          );
          res.status(500).json({ error: "Unknown error occurred" });
          break;
      }
      /**
       * 쿼리 실행 실패 처리
       */
    } catch (queryError) {
      logger.error(`${CATCH_DATABASE_PREFIX} :: Query execution failed.`);
      logger.error(queryError);
      res
        .status(CATCH_DATABASE_QUERY_CODE)
        .json({ error: "Query execution failed" });
    }
    /**
     * 알 수 없는 오류 처리
     */
  } catch (error) {
    logger.error(
      `${CATCH_DATABASE_PREFIX} :: An error occurred for unknown reasons.`
    );
    logger.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    /**
     * 데이터베이스 연결 해제
     */
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        logger.error(
          `${CATCH_DATABASE_PREFIX} :: Failed to release connection.`
        );
        logger.error(releaseError);
      }
    }
  }
});

module.exports = router;
