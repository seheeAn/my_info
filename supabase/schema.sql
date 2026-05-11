-- posts 테이블
CREATE TABLE posts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text        NOT NULL CHECK (source IN ('velog', 'tistory')),
  original_id   text        NOT NULL,
  title         text        NOT NULL,
  url           text        NOT NULL,
  thumbnail     text,
  summary       text,
  tags          text[]      NOT NULL DEFAULT '{}',
  category      text,
  published_at  timestamptz NOT NULL,
  is_deleted    boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, original_id)
);

-- activity_log 테이블
CREATE TABLE activity_log (
  id      uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  date    date  NOT NULL,
  source  text  NOT NULL CHECK (source IN ('velog', 'tistory', 'github')),
  count   integer NOT NULL DEFAULT 0,
  UNIQUE (date, source)
);

-- 인덱스
CREATE INDEX idx_posts_source_published_at ON posts (source, published_at DESC);
CREATE INDEX idx_posts_category            ON posts (category);
CREATE INDEX idx_posts_is_deleted          ON posts (is_deleted);
CREATE INDEX idx_activity_log_date         ON activity_log (date DESC);
CREATE INDEX idx_activity_log_source_date  ON activity_log (source, date);
