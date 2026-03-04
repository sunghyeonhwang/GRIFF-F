-- ============================================
-- GRIFF Frame — Schema v2: 버전 관리
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. project_versions 테이블 생성
CREATE TABLE project_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  vimeo_url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, version_number)
);
CREATE INDEX idx_pv_project ON project_versions(project_id);

-- 2. comments 테이블에 version_id 컬럼 추가
ALTER TABLE comments ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES project_versions(id);

-- 3. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE project_versions;

-- ============================================
-- 4. RLS 정책 — project_versions
-- ============================================
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

-- 멤버: 자기 프로젝트의 버전 조회
CREATE POLICY "members_select_versions"
  ON project_versions FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
  );

-- 멤버: 버전 추가
CREATE POLICY "members_insert_versions"
  ON project_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
  );

-- 멤버: 버전 수정 (is_active 토글 등)
CREATE POLICY "members_update_versions"
  ON project_versions FOR UPDATE
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
  );

-- 멤버: 버전 삭제
CREATE POLICY "members_delete_versions"
  ON project_versions FOR DELETE
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
  );

-- 게스트(anon): 공유된 프로젝트의 버전 조회
CREATE POLICY "guests_select_versions"
  ON project_versions FOR SELECT
  TO anon
  USING (
    project_id IN (SELECT id FROM projects WHERE share_token IS NOT NULL)
  );

-- ============================================
-- 5. 마이그레이션: 기존 프로젝트에 v1 자동 생성
-- ============================================
INSERT INTO project_versions (project_id, version_number, vimeo_url, description, is_active, created_by)
SELECT id, 1, vimeo_url, '초기 버전', true, created_by
FROM projects
WHERE id NOT IN (SELECT DISTINCT project_id FROM project_versions);

-- 6. 기존 코멘트를 v1에 연결
UPDATE comments
SET version_id = (
  SELECT pv.id FROM project_versions pv
  WHERE pv.project_id = comments.project_id AND pv.version_number = 1
)
WHERE version_id IS NULL;
