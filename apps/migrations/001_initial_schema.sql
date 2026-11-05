-- StellarLearn initial database schema
-- Run with: psql "$DATABASE_URL" -f apps/migrations/001_initial_schema.sql

-- ============================================
-- Auth schema (service-auth)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  public_key     VARCHAR(56) PRIMARY KEY,
  first_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen      TIMESTAMPTZ NOT NULL DEFAULT now(),
  login_count    INTEGER     NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  public_key     VARCHAR(56) NOT NULL,
  challenge      TEXT        NOT NULL,
  expires_at     BIGINT      NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (public_key)
);

-- ============================================
-- Courses schema (service-courses)
-- ============================================

CREATE TABLE IF NOT EXISTS courses (
  id            VARCHAR(128) PRIMARY KEY,
  title         VARCHAR(256) NOT NULL,
  description   TEXT         NOT NULL DEFAULT '',
  instructor    VARCHAR(128) NOT NULL DEFAULT 'StellarLearn Team',
  price         NUMERIC(20,7) NOT NULL DEFAULT 0,  -- in XLM stroops
  category      VARCHAR(64)  NOT NULL DEFAULT 'blockchain',
  level         VARCHAR(16)  NOT NULL DEFAULT 'beginner',
  modules       JSONB        NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrolments (
  learner_public_key VARCHAR(56)  NOT NULL,
  course_id          VARCHAR(128) NOT NULL,
  enrolled_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  progress           JSONB        NOT NULL DEFAULT '{}',
  PRIMARY KEY (learner_public_key, course_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_enrolments_learner ON enrolments(learner_public_key);
