-- ============================================================
--  ЛОГИКА ПОДСЧЁТА БАЛЛОВ
--  Балл зависит от правильности и скорости ответа
-- ============================================================

-- Формула: score = max_points * (1 - 0.5 * time_ratio)
-- time_ratio = time_taken_ms / (time_limit * 1000)
-- Минимум: 50% от max_points за правильный (но медленный) ответ
-- Неправильный ответ: 0 баллов

CREATE OR REPLACE FUNCTION calculate_score(
    p_is_correct    BOOLEAN,
    p_max_points    INT,
    p_time_taken_ms INT,
    p_time_limit_s  INT
) RETURNS INT AS $$
DECLARE
    v_time_ratio  FLOAT;
    v_score       INT;
BEGIN
    IF NOT p_is_correct THEN
        RETURN 0;
    END IF;

    v_time_ratio := LEAST(
        p_time_taken_ms::FLOAT / (p_time_limit_s * 1000)::FLOAT,
        1.0
    );

    v_score := ROUND(p_max_points * (1.0 - 0.5 * v_time_ratio));

    RETURN GREATEST(v_score, ROUND(p_max_points * 0.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Обновить total_score у участника после ответа
CREATE OR REPLACE FUNCTION update_participant_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE session_participants
    SET total_score = total_score + NEW.score_earned
    WHERE session_id = NEW.session_id
      AND user_id    = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_score_on_answer
    AFTER INSERT ON participant_answers
    FOR EACH ROW EXECUTE FUNCTION update_participant_score();

-- Проставить итоговые ранги при завершении сессии
CREATE OR REPLACE FUNCTION finalize_session_ranks(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
    WITH ranked AS (
        SELECT
            id,
            RANK() OVER (ORDER BY total_score DESC) AS final_rank
        FROM session_participants
        WHERE session_id = p_session_id
    )
    UPDATE session_participants sp
    SET rank = r.final_rank
    FROM ranked r
    WHERE sp.id = r.id;

    UPDATE quiz_sessions
    SET status   = 'FINISHED',
        ended_at = NOW()
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────
--  ПРИМЕРЫ ЗАПРОСОВ для бэкенда
-- ─────────────────────────────────────────

-- 1. Получить вопрос с вариантами (БЕЗ is_correct для участников)
-- SELECT
--     q.id, q.type, q.answer_mode, q.question_text,
--     q.image_url, q.time_limit, q.points,
--     json_agg(
--         json_build_object(
--             'id',        ao.id,
--             'text',      ao.text,
--             'image_url', ao.image_url,
--             'order',     ao.order_index
--         ) ORDER BY ao.order_index
--     ) AS options
-- FROM quiz_questions q
-- JOIN answer_options ao ON ao.question_id = q.id
-- WHERE q.id = $1
-- GROUP BY q.id;

-- 2. Лидерборд после окончания квиза
-- SELECT * FROM v_session_leaderboard WHERE session_id = $1 ORDER BY current_rank;

-- 3. История участника
-- SELECT * FROM v_participant_history WHERE user_id = $1 ORDER BY ended_at DESC;
