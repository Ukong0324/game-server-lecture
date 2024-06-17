DROP TABLE IF EXISTS game_db.tGame;

CREATE TABLE game_db.tGame (
    id CHAR(36) PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL,
    player_id CHAR(36) NOT NULL,
    score INT NOT NULL,
    duration INT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES user_db.tUser(player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DESC tGame;
SHOW INDEX FROM tGame;

-- --------------------------------------------------------------------
-- 테스트 쿼리 예시
-- --------------------------------------------------------------------

-- 게임 데이터 삽입
INSERT INTO tGame (id, game_id, player_id, score, duration) VALUES (UUID(), 'game123', '96e0312e-2811-11ef-a481-000c296fc89a', 2500, 300);

-- 게임 데이터 조회
SELECT * FROM tGame WHERE game_id = 'game123' AND player_id = '96e0312e-2811-11ef-a481-000c296fc89a';