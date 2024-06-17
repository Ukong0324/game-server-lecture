const mariadb = require("mariadb");
const Logger = require("./logger");
const logger = new Logger();

const PREFIX = "[DATABASE CONNECTION]";

/**
 * 데이터베이스 설정 객체
 * @typedef {Object} DbConfig
 * @property {string} host - 데이터베이스 호스트
 * @property {number} port - 데이터베이스 포트
 * @property {string} user - 데이터베이스 사용자
 * @property {string} password - 데이터베이스 비밀번호
 * @property {string} database - 데이터베이스 이름
 */

/**
 * 데이터베이스 연결 풀을 생성함.
 * @param {DbConfig} config - 데이터베이스 설정 객체
 * @returns {mariadb.Pool} 데이터베이스 연결 풀
 */
function createPool(config) {
  return mariadb.createPool(config);
}

/**
 * 데이터베이스 연결 풀을 생성하고 연결 시도함.
 * @param {DbConfig} config - 데이터베이스 설정 객체
 * @returns {Promise<mariadb.Pool>} 데이터베이스 연결 풀
 */
async function initializePool(config) {
  const pool = createPool(config);
  try {
    const conn = await pool.getConnection();
    logger.info(
      `${PREFIX} :: Database connected successfully to ${config.database}!`
    );
    conn.release();
  } catch (err) {
    logger.error(
      `${PREFIX} :: Unable to connect to the database ${config.database}: ${err.message}`
    );
  }
  return pool;
}

// 공통 데이터베이스 설정
const commonConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

// 여러 데이터베이스 설정
const dbConfigs = {
  user: {
    ...commonConfig,
    database: process.env.DB_USER_DB,
  },
  game: {
    ...commonConfig,
    database: process.env.DB_GAME_DB,
  },
};

/**
 * 모든 데이터베이스 연결 풀을 초기화함.
 * @returns {Promise<Object<string, mariadb.Pool>>} 모든 데이터베이스 연결 풀 객체
 */
async function initializeAllPools() {
  const pools = {};
  for (const [key, config] of Object.entries(dbConfigs)) {
    pools[key] = await initializePool(config);
  }
  return pools;
}

module.exports = initializeAllPools();
