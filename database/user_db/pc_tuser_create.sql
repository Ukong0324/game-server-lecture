-- --------------------------------------------------------------------
-- 기존 프로시저 삭제
-- --------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_create_user;

DELIMITER $$

-- --------------------------------------------------------------------
-- 프로시저 생성
-- --------------------------------------------------------------------
CREATE PROCEDURE sp_create_user(
    IN p_nickname VARCHAR(255),
    IN p_count INT,
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
    -- 입력 매개변수 유효성 검사
    -- --------------------------------------------------------------------
    IF CHAR_LENGTH(p_nickname) < 1 THEN
        SET p_result = 400;
        SET p_result2 = 'ERROR: Nickname is too short';
        LEAVE sp;
    END IF;

    IF CHAR_LENGTH(p_nickname) > 255 THEN
        SET p_result = 400;
        SET p_result2 = 'ERROR: Nickname is too long';
        LEAVE sp;
    END IF;

    IF p_count < 0 THEN
        SET p_result = 400;
        SET p_result2 = 'ERROR: Count cannot be negative';
        LEAVE sp;
    END IF;

    -- --------------------------------------------------------------------
    -- 닉네임 중복 검사
    -- --------------------------------------------------------------------
    IF EXISTS (SELECT 1 FROM tUser WHERE nickname = p_nickname) THEN
        SET p_result = 409;
        SET p_result2 = 'ERROR: Nickname already exists';
        LEAVE sp;
    END IF;

    -- --------------------------------------------------------------------
    -- 유효성 검사를 통과한 경우에만 INSERT 실행
    -- --------------------------------------------------------------------
    INSERT INTO tUser (player_id, nickname, count, createdAt)
    VALUES (UUID(), p_nickname, p_count, CURRENT_TIMESTAMP);

    SET p_result = 200;
    SET p_result2 = 'DONE: User created successfully';
END $$

DELIMITER ;

-- --------------------------------------------------------------------
-- 테스트 쿼리 예시
-- --------------------------------------------------------------------

-- 정상 처리
CALL sp_create_user('test_user1', 0, @result, @result2);
SELECT @result, @result2;

-- --------------------------------------------------------------------
-- 예외 상황 테스트 쿼리
-- --------------------------------------------------------------------

-- 1. 닉네임 길이 오류
CALL sp_create_user('', 0, @result, @result2);
SELECT @result, @result2;

CALL sp_create_user(REPEAT('a', 256), 0, @result, @result2);
SELECT @result, @result2;

-- 2. 닉네임 중복
-- 먼저 정상적인 데이터 삽입
CALL sp_create_user('test_user2', 0, @result, @result2);
SELECT @result, @result2;

-- 중복 데이터 삽입 시도
CALL sp_create_user('test_user2', 0, @result, @result2);
SELECT @result, @result2;

-- 3. 카운트 음수 오류
CALL sp_create_user('test_user3', -1, @result, @result2);
SELECT @result, @result2;