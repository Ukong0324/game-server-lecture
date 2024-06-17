-- --------------------------------------------------------------------
-- 기존 프로시저 삭제
-- --------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_create_game;

DELIMITER $$

-- --------------------------------------------------------------------
-- 프로시저 생성
-- --------------------------------------------------------------------
CREATE PROCEDURE sp_create_game(
    IN p_game_id VARCHAR(255),
    IN p_player_id CHAR(36),
    IN p_score INT,
    IN p_duration INT,
    OUT p_result INT,
    OUT p_result2 VARCHAR(512)
)
sp: BEGIN
    -- --------------------------------------------------------------------
    -- SQL Exception 처리
    -- --------------------------------------------------------------------
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @sqlstate = RETURNED_SQLSTATE, 
        @errno = MYSQL_ERRNO, @text = MESSAGE_TEXT;
        SET p_result2 = CONCAT("ERROR: ", @errno, " (", @sqlstate, ") -> ", @text);
        SET p_result = -101;
    END;

    -- --------------------------------------------------------------------
    -- game_id 길이 오류 처리
    -- --------------------------------------------------------------------
    IF CHAR_LENGTH(p_game_id) < 1 OR CHAR_LENGTH(p_game_id) > 255 THEN
        SET p_result = 400;
        SET p_result2 = 'ERROR: Invalid game_id length';
        LEAVE sp;
    END IF;

    -- --------------------------------------------------------------------
    -- player_id가 NULL인 경우 처리
    -- --------------------------------------------------------------------
    IF p_player_id IS NULL THEN
        SET p_result = 400;
        SET p_result2 = 'ERROR: player_id is required';
        LEAVE sp;
    END IF;

    -- --------------------------------------------------------------------
    -- score가 음수인 경우 처리
    -- --------------------------------------------------------------------
    IF p_score < 0 THEN
        SET p_result = 400;
        SET p_result2 = 'ERROR: Invalid score';
        LEAVE sp;
    END IF;

    -- --------------------------------------------------------------------
    -- duration이 음수인 경우 처리
    -- --------------------------------------------------------------------
    IF p_duration < 0 THEN
        SET p_result = 400;
        SET p_result2 = 'ERROR: Invalid duration';
        LEAVE sp;
    END IF;

    -- --------------------------------------------------------------------
    -- game_id && player_id 중복 검사
    -- --------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM tGame WHERE game_id = p_game_id AND player_id = p_player_id) THEN
        SET p_result = 409;
        SET p_result2 = 'ERROR: Duplicate game_id for the same player_id';
        LEAVE sp;
    END IF;

    -- --------------------------------------------------------------------
    -- 게임 데이터 삽입
    -- --------------------------------------------------------------------
    INSERT INTO tGame (id, game_id, player_id, score, duration)
    VALUES (UUID(), p_game_id, p_player_id, p_score, p_duration);

    SET p_result = 200;
    SET p_result2 = 'DONE: Game data saved successfully';
END $$

DELIMITER ;

-- --------------------------------------------------------------------
-- 테스트 쿼리 예시
-- --------------------------------------------------------------------

-- 정상 처리
CALL sp_create_game('game1', '96e0312e-2811-11ef-a481-000c296fc89a', 2500, 300, @result, @result2);
SELECT @result, @result2;

-- --------------------------------------------------------------------
-- 예외 상황 테스트 쿼리
-- --------------------------------------------------------------------

-- 1. game_id 길이 오류
CALL sp_create_game('', '96e0312e-2811-11ef-a481-000c296fc89a', 2500, 300, @result, @result2);
SELECT @result, @result2;

CALL sp_create_game(REPEAT('a', 256), '96e0312e-2811-11ef-a481-000c296fc89a', 2500, 300, @result, @result2);
SELECT @result, @result2;

-- 2. player_id가 NULL인 경우
CALL sp_create_game('game2', NULL, 2500, 300, @result, @result2);
SELECT @result, @result2;

-- 3. score가 음수인 경우
CALL sp_create_game('game3', '96e0312e-2811-11ef-a481-000c296fc89a', -10, 300, @result, @result2);
SELECT @result, @result2;

-- 4. duration이 음수인 경우
CALL sp_create_game('game4', '96e0312e-2811-11ef-a481-000c296fc89a', 2500, -300, @result, @result2);
SELECT @result, @result2;

-- 5. game_id와 player_id의 중복
-- 먼저 정상적인 데이터 삽입
CALL sp_create_game('game5', '96e0312e-2811-11ef-a481-000c296fc89a', 2500, 300, @result, @result2);
SELECT @result, @result2;

-- 중복 데이터 삽입 시도
CALL sp_create_game('game5', '96e0312e-2811-11ef-a481-000c296fc89a', 2500, 300, @result, @result2);
SELECT @result, @result2;