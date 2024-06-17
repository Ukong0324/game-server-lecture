DROP TABLE IF EXISTS user_db.tUser;

CREATE TABLE user_db.tUser (
    player_id CHAR(36) PRIMARY KEY,
    nickname VARCHAR(255) NOT NULL,
    count INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DESC tUser;
SHOW INDEX FROM tUser;

-- --------------------------------------------------------------------
-- 테스트 쿼리 예시
-- --------------------------------------------------------------------

-- 사용자 생성
INSERT INTO tUser (player_id, nickname) VALUES (UUID(), 'test_user');

-- 사용자 조회
SELECT * FROM tUser WHERE nickname = 'test_user';
