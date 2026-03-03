-- ============================================
-- GRIFF Frame — Row Level Security Policies
-- ============================================

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Projects 정책
-- ============================================

-- 멤버: 자기가 만든 프로젝트 조회
CREATE POLICY "members_select_own_projects"
  ON projects FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- 멤버: 프로젝트 생성
CREATE POLICY "members_insert_projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 멤버: 자기 프로젝트 수정
CREATE POLICY "members_update_own_projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- 게스트(anon): share_token으로 프로젝트 조회
CREATE POLICY "guests_select_shared_projects"
  ON projects FOR SELECT
  TO anon
  USING (share_token IS NOT NULL);

-- ============================================
-- Comments 정책
-- ============================================

-- 멤버: 자기 프로젝트의 코멘트 조회
CREATE POLICY "members_select_comments"
  ON comments FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- 멤버: 코멘트 추가
CREATE POLICY "members_insert_comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- 멤버: 본인 코멘트 수정 (resolve 토글 등)
CREATE POLICY "members_update_own_comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- 멤버: 본인 코멘트 삭제
CREATE POLICY "members_delete_own_comments"
  ON comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- 게스트(anon): 공유된 프로젝트의 코멘트 조회
CREATE POLICY "guests_select_comments"
  ON comments FOR SELECT
  TO anon
  USING (
    project_id IN (
      SELECT id FROM projects WHERE share_token IS NOT NULL
    )
  );

-- 게스트(anon): 공유된 프로젝트에 코멘트 추가 (author_id = NULL)
CREATE POLICY "guests_insert_comments"
  ON comments FOR INSERT
  TO anon
  WITH CHECK (
    author_id IS NULL
    AND project_id IN (
      SELECT id FROM projects WHERE share_token IS NOT NULL
    )
  );
