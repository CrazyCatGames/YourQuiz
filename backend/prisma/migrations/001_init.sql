-- ============================================================
--  Quiz App — SQL DDL  (PostgreSQL 15+)
--  Порядок создания уважает зависимости внешних ключей
-- ============================================================

-- Расширения
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ─────────────────────────────────────────
--  ENUMS
-- ─────────────────────────────────────────

CREATE TYPE role AS ENUM ('PARTICIPANT', 'ORGANIZER');
CREATE TYPE question_type AS ENUM ('TEXT', 'IMAGE');
CREATE TYPE answer_mode AS ENUM ('SINGLE', 'MULTIPLE');
CREATE TYPE session_status AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- ─────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────

CREATE TABLE users (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT        NOT NULL UNIQUE,
    password_hash  TEXT        NOT NULL,
    display_name   TEXT        NOT NULL,
    avatar_url     TEXT,
    role           role        NOT NULL DEFAULT 'PARTICIPANT',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- ─────────────────────────────────────────
--  CATEGORIES
-- ─────────────────────────────────────────

CREATE TABLE categories (
    id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name   TEXT NOT NULL UNIQUE,
    icon   TEXT,
    color  TEXT
);

-- Стартовые категории
INSERT INTO categories (name, icon, color) VALUES
    ('История',         '🏛️', '#8B5CF6'),
    ('Наука',           '🔬', '#06B6D4'),
    ('Спорт',           '⚽', '#10B981'),
    ('Культура',        '🎭', '#F59E0B'),
    ('Технологии',      '💻', '#3B82F6'),
    ('Кино и сериалы',  '🎬', '#EF4444'),
    ('Музыка',          '🎵', '#EC4899'),
    ('Разное',          '🎲', '#6B7280');

-- ─────────────────────────────────────────
--  QUIZZES
-- ─────────────────────────────────────────

CREATE TABLE quizzes (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title                     TEXT        NOT NULL,
    description               TEXT,
    cover_image_url           TEXT,
    category_id               UUID        REFERENCES categories (id) ON DELETE SET NULL,
    created_by_id             UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    default_time_per_question INT         NOT NULL DEFAULT 30,   -- секунды
    max_participants          INT,                               -- NULL = без лимита
    is_public                 BOOLEAN     NOT NULL DEFAULT FALSE,
    shuffle_questions         BOOLEAN     NOT NULL DEFAULT FALSE,
    show_correct_answers      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizzes_created_by ON quizzes (created_by_id);
CREATE INDEX idx_quizzes_category   ON quizzes (category_id);
CREATE INDEX idx_quizzes_public     ON quizzes (is_public) WHERE is_public = TRUE;

-- ─────────────────────────────────────────
--  QUESTIONS
-- ─────────────────────────────────────────

CREATE TABLE quiz_questions (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id       UUID          NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    order_index   INT           NOT NULL,
    type          question_type NOT NULL DEFAULT 'TEXT',
    answer_mode   answer_mode   NOT NULL DEFAULT 'SINGLE',
    question_text TEXT,                          -- текст вопроса (обязателен если type=TEXT)
    image_url     TEXT,                          -- URL картинки (обязателен если type=IMAGE)
    time_limit    INT           NOT NULL DEFAULT 30,  -- секунды
    points        INT           NOT NULL DEFAULT 100,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    UNIQUE (quiz_id, order_index),
    CONSTRAINT chk_question_content CHECK (
        question_text IS NOT NULL OR image_url IS NOT NULL
    )
);

CREATE INDEX idx_questions_quiz ON quiz_questions (quiz_id, order_index);

-- ─────────────────────────────────────────
--  ANSWER OPTIONS
-- ─────────────────────────────────────────

CREATE TABLE answer_options (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id  UUID    NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
    order_index  INT     NOT NULL,
    text         TEXT,
    image_url    TEXT,
    is_correct   BOOLEAN NOT NULL,

    UNIQUE (question_id, order_index),
    CONSTRAINT chk_option_content CHECK (
        text IS NOT NULL OR image_url IS NOT NULL
    )
);

CREATE INDEX idx_options_question ON answer_options (question_id);

-- ─────────────────────────────────────────
--  QUIZ SESSIONS
-- ─────────────────────────────────────────

CREATE TABLE quiz_sessions (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id                 UUID           NOT NULL REFERENCES quizzes (id) ON DELETE RESTRICT,
    host_id                 UUID           NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    room_code               CHAR(6)        NOT NULL UNIQUE,   -- напр. "AB12CD"
    status                  session_status NOT NULL DEFAULT 'WAITING',
    current_question_index  INT            NOT NULL DEFAULT 0,
    question_started_at     TIMESTAMPTZ,
    started_at              TIMESTAMPTZ,
    ended_at                TIMESTAMPTZ,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_quiz       ON quiz_sessions (quiz_id);
CREATE INDEX idx_sessions_host       ON quiz_sessions (host_id);
CREATE INDEX idx_sessions_room_code  ON quiz_sessions (room_code);
CREATE INDEX idx_sessions_status     ON quiz_sessions (status) WHERE status IN ('WAITING', 'IN_PROGRESS');

-- ─────────────────────────────────────────
--  SESSION PARTICIPANTS
-- ─────────────────────────────────────────

CREATE TABLE session_participants (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID        NOT NULL REFERENCES quiz_sessions (id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    total_score INT         NOT NULL DEFAULT 0,
    rank        INT,                              -- итоговое место, NULL до окончания
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, user_id)
);

CREATE INDEX idx_participants_session ON session_participants (session_id);
CREATE INDEX idx_participants_user    ON session_participants (user_id);
CREATE INDEX idx_participants_score   ON session_participants (session_id, total_score DESC);

-- ─────────────────────────────────────────
--  PARTICIPANT ANSWERS
-- ─────────────────────────────────────────

CREATE TABLE participant_answers (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID        NOT NULL REFERENCES quiz_sessions (id) ON DELETE CASCADE,
    question_id   UUID        NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    is_correct    BOOLEAN     NOT NULL,
    score_earned  INT         NOT NULL DEFAULT 0,
    time_taken_ms INT         NOT NULL,           -- мс от показа вопроса до ответа
    answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, question_id, user_id)
);

CREATE INDEX idx_answers_session  ON participant_answers (session_id);
CREATE INDEX idx_answers_user     ON participant_answers (session_id, user_id);
CREATE INDEX idx_answers_question ON participant_answers (question_id);

-- ─────────────────────────────────────────
--  SELECTED OPTIONS  (M:M через промежуточную)
-- ─────────────────────────────────────────

CREATE TABLE selected_options (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_answer_id UUID NOT NULL REFERENCES participant_answers (id) ON DELETE CASCADE,
    answer_option_id      UUID NOT NULL REFERENCES answer_options (id) ON DELETE CASCADE,

    UNIQUE (participant_answer_id, answer_option_id)
);

CREATE INDEX idx_selected_answer ON selected_options (participant_answer_id);
CREATE INDEX idx_selected_option ON selected_options (answer_option_id);

-- ─────────────────────────────────────────
--  АВТООБНОВЛЕНИЕ updated_at  (триггер)
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON quiz_questions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────
--  ПОЛЕЗНЫЕ ВЬЮХИ
-- ─────────────────────────────────────────

-- Лидерборд сессии (используется после каждого вопроса)
CREATE OR REPLACE VIEW v_session_leaderboard AS
SELECT
    sp.session_id,
    u.id          AS user_id,
    u.display_name,
    u.avatar_url,
    sp.total_score,
    RANK() OVER (
        PARTITION BY sp.session_id
        ORDER BY sp.total_score DESC
    )             AS current_rank
FROM session_participants sp
JOIN users u ON u.id = sp.user_id;

-- История участника (для личного кабинета)
CREATE OR REPLACE VIEW v_participant_history AS
SELECT
    sp.user_id,
    qs.id         AS session_id,
    qs.room_code,
    qs.ended_at,
    q.title       AS quiz_title,
    sp.total_score,
    sp.rank,
    (SELECT COUNT(*) FROM session_participants sp2
     WHERE sp2.session_id = qs.id) AS total_participants
FROM session_participants sp
JOIN quiz_sessions qs ON qs.id = sp.session_id
JOIN quizzes       q  ON q.id  = qs.quiz_id
WHERE qs.status = 'FINISHED';

-- История организатора
CREATE OR REPLACE VIEW v_organizer_history AS
SELECT
    qs.host_id    AS organizer_id,
    qs.id         AS session_id,
    qs.room_code,
    qs.status,
    qs.started_at,
    qs.ended_at,
    q.id          AS quiz_id,
    q.title       AS quiz_title,
    (SELECT COUNT(*) FROM session_participants sp
     WHERE sp.session_id = qs.id) AS participant_count
FROM quiz_sessions qs
JOIN quizzes q ON q.id = qs.quiz_id;
