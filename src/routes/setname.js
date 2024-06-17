const express = require("express");
const Logger = require("../utils/logger");
const logger = new Logger();
const router = express.Router();
const { Mutex } = require("async-mutex");

/**
 * 요청 에러 코드
 */
const CATCH_REQUEST_PREFIX = "[REQUEST]";
const CATCH_INVALID_NAME_CODE = 400;

/**
 * 데이터베이스 에러 코드
 */
const CATCH_DATABASE_PREFIX = "[DATABASE]";
const CATCH_DATABASE_CONN_CODE = 521;
const CATCH_DATABASE_QUERY_CODE = 522;

/**
 * 이름 검증 미들웨어
 */
const validateName = (req, res, next) => {
  const { name } = req.body;
  if (
    !name ||
    typeof name !== "string" ||
    name.trim() === "" ||
    name.length > 255
  ) {
    logger.warn(
      `${CATCH_REQUEST_PREFIX} :: Request received with an invalid name.`
    );
    return res.status(CATCH_INVALID_NAME_CODE).json({ error: "Invalid name" });
  }
  next();
};

// 서버 시작 시 카운터 초기화
let counter = 0;

// 뮤텍스 초기화
const counterMutex = new Mutex();

/**
 * @route POST /setName
 * @description 유저의 닉네임을 저장하는 라우터
 */
router.post("/", validateName, async (req, res) => {
  const { name } = req.body;
  const dbPools = req.dbPools;

  let connection;
  try {
    /**
     * 데이터베이스 연결
     * @returns {object} connection - 데이터베이스 연결 객체
     */
    connection = await dbPools.user.getConnection();

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
      // 뮤텍스 잠금
      await counterMutex.runExclusive(async () => {
        // 카운터 증가
        counter += 1;

        /**
         * sp_create_user 프로시저 호출
         * @param {string} name - 유저의 닉네임
         * @param {int} counter - 카운터 값
         */
        await connection.query(
          "CALL sp_create_user(?, ?, @result, @result2);",
          [name, counter]
        );
      });

      /**
       * 결과 조회
       */
      const [rows] = await connection.query("SELECT @result, @result2;");
      const result = Number(rows["@result"]);
      const result2 = rows["@result2"];

      // 결과에 따른 응답 처리
      switch (result) {
        // 유저 닉네임 저장 성공
        case 200:
          logger.info(
            `${CATCH_DATABASE_PREFIX} :: User nickname saved successfully.`
          );
          res.status(200).json({ message: result2 });
          break;
        // 유저 닉네임 저장 실패
        case 400:
        case 409:
          logger.warn(
            `${CATCH_DATABASE_PREFIX} :: User nickname not saved. Reason: ${result2}`
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
            `${CATCH_DATABASE_PREFIX} :: User nickname not saved for unknown reasons. Reason: ${result2}`
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
