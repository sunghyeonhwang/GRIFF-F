-- ============================================
-- RLS 무한 재귀 수정
-- ============================================
-- 문제: project_members SELECT 정책이 자기 자신을 참조 → 무한 재귀
-- 해결: project_members는 user_id = auth.uid() 직접 확인

-- 1. project_members 정책 수정
DROP POLICY IF EXISTS "members_select" ON project_members;
CREATE POLICY "members_select" ON project_members FOR SELECT USING (
  user_id = auth.uid()
);

-- INSERT는 자기 자신의 project_members를 참조하면 안 됨
-- member_insert는 기존 멤버만 초대 가능해야 하므로, 별도 접근
DROP POLICY IF EXISTS "members_insert" ON project_members;
CREATE POLICY "members_insert" ON project_members FOR INSERT WITH CHECK (
  -- 본인이 해당 프로젝트의 멤버이거나, 본인이 owner로 프로젝트를 생성한 경우
  project_id IN (
    SELECT id FROM projects WHERE created_by = auth.uid()
  )
  OR project_id IN (
    SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
  )
);

-- UPDATE/DELETE는 owner만 — project_members 재귀 대신 직접 체크
DROP POLICY IF EXISTS "members_update" ON project_members;
CREATE POLICY "members_update" ON project_members FOR UPDATE USING (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.role = 'owner'
  )
);

DROP POLICY IF EXISTS "members_delete" ON project_members;
CREATE POLICY "members_delete" ON project_members FOR DELETE USING (
  project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.role = 'owner'
  )
);

-- 2. projects SELECT 정책도 수정 — 재귀 없이
DROP POLICY IF EXISTS "members_select_projects_v2" ON projects;
CREATE POLICY "members_select_projects_v2" ON projects FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
    OR created_by = auth.uid()  -- 생성자는 항상 볼 수 있음 (멤버 등록 전에도)
  );

-- 3. project_invites SELECT도 동일하게
DROP POLICY IF EXISTS "invites_select" ON project_invites;
CREATE POLICY "invites_select" ON project_invites FOR SELECT USING (
  project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
  OR invited_by = auth.uid()
);

DROP POLICY IF EXISTS "invites_insert" ON project_invites;
CREATE POLICY "invites_insert" ON project_invites FOR INSERT WITH CHECK (
  project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
);

-- 4. comments도 동일
DROP POLICY IF EXISTS "members_select_comments_v2" ON comments;
CREATE POLICY "members_select_comments_v2" ON comments FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_insert_comments_v2" ON comments;
CREATE POLICY "members_insert_comments_v2" ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
  );

-- 5. project_versions도 동일
DROP POLICY IF EXISTS "members_select_versions_v2" ON project_versions;
CREATE POLICY "members_select_versions_v2" ON project_versions FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_insert_versions_v2" ON project_versions;
CREATE POLICY "members_insert_versions_v2" ON project_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_update_versions_v2" ON project_versions;
CREATE POLICY "members_update_versions_v2" ON project_versions FOR UPDATE
  TO authenticated
  USING (
    project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_delete_versions_v2" ON project_versions;
CREATE POLICY "members_delete_versions_v2" ON project_versions FOR DELETE
  TO authenticated
  USING (
    project_id IN (SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid() AND pm.role = 'owner')
  );

-- 6. profiles INSERT 정책 — 가입 직후 본인 프로필 생성 허용
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());
