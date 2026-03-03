-- ============================================
-- GRIFF Frame — Supabase Schema
-- ============================================

-- projects 테이블
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  vimeo_url TEXT NOT NULL,
  share_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- comments 테이블
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  timecode_seconds FLOAT NOT NULL,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),  -- NULL이면 게스트
  author_color TEXT DEFAULT '#3d8bfd',
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_comments_project_id ON comments(project_id);
CREATE INDEX idx_comments_timecode ON comments(project_id, timecode_seconds);
CREATE INDEX idx_projects_share_token ON projects(share_token);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
