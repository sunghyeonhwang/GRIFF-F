-- ============================================
-- GRIFF Frame — Schema v4: 회원관리 + 권한 체계
-- ============================================
-- 실행 전: schema.sql, schema-v2.sql, schema-v3.sql이 이미 적용되어 있어야 합니다.

-- ============================================
-- 1. profiles 테이블 (사용자 프로필)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- display_name 유니크 제약 (동일 이름 불가)
ALTER TABLE profiles ADD CONSTRAINT profiles_display_name_unique UNIQUE (display_name);

-- 회원가입 시 자동 프로필 생성 trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_name TEXT;
  final_name TEXT;
  suffix INT := 0;
BEGIN
  base_name := split_part(NEW.email, '@', 1);
  final_name := base_name;
  -- 중복 시 숫자 붙여서 유니크하게
  LOOP
    BEGIN
      INSERT INTO profiles (id, display_name)
      VALUES (NEW.id, final_name);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      suffix := suffix + 1;
      final_name := base_name || suffix;
    END;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 trigger가 있으면 제거 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. project_members 테이블 (프로젝트 멤버십)
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_user ON project_members(user_id);

-- ============================================
-- 3. project_invites 테이블 (초대 관리)
-- ============================================
CREATE TABLE IF NOT EXISTS project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT,
  invite_token UUID DEFAULT gen_random_uuid(),
  invite_type TEXT NOT NULL CHECK (invite_type IN ('member', 'guest')) DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_project ON project_invites(project_id);
CREATE INDEX IF NOT EXISTS idx_pi_token ON project_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_pi_email ON project_invites(email);

-- ============================================
-- 4. projects 테이블 컬럼 추가
-- ============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid();

-- ============================================
-- 5. 마이그레이션: 기존 프로젝트 → owner 자동 등록
-- ============================================
INSERT INTO project_members (project_id, user_id, role)
SELECT id, created_by, 'owner'
FROM projects
WHERE created_by IS NOT NULL
  AND id NOT IN (SELECT project_id FROM project_members)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. 기존 유저 → profiles 자동 생성
-- ============================================
INSERT INTO profiles (id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. RLS 활성화
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS 정책 — profiles
-- ============================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================
-- 9. RLS 정책 — project_members
-- ============================================
DROP POLICY IF EXISTS "members_select" ON project_members;
CREATE POLICY "members_select" ON project_members FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "members_insert" ON project_members;
CREATE POLICY "members_insert" ON project_members FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "members_update" ON project_members;
CREATE POLICY "members_update" ON project_members FOR UPDATE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
);

DROP POLICY IF EXISTS "members_delete" ON project_members;
CREATE POLICY "members_delete" ON project_members FOR DELETE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
);

-- ============================================
-- 10. RLS 정책 — project_invites
-- ============================================
DROP POLICY IF EXISTS "invites_select" ON project_invites;
CREATE POLICY "invites_select" ON project_invites FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "invites_insert" ON project_invites;
CREATE POLICY "invites_insert" ON project_invites FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "invites_update" ON project_invites;
CREATE POLICY "invites_update" ON project_invites FOR UPDATE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
);

-- ============================================
-- 11. RLS 정책 — projects 업데이트 (멤버 기반)
-- ============================================
-- 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "members_select_own_projects" ON projects;
DROP POLICY IF EXISTS "members_update_own_projects" ON projects;
DROP POLICY IF EXISTS "members_delete_own_projects" ON projects;

-- 멤버: project_members에 있는 프로젝트만 조회
CREATE POLICY "members_select_projects_v2" ON projects FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- owner만 수정
CREATE POLICY "members_update_projects_v2" ON projects FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- owner만 삭제
CREATE POLICY "members_delete_projects_v2" ON projects FOR DELETE
  TO authenticated
  USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- 게스트 공유 정책 유지 (기존)
-- guests_select_shared_projects 이미 존재

-- ============================================
-- 12. RLS 정책 — comments 업데이트 (멤버 기반)
-- ============================================
DROP POLICY IF EXISTS "members_select_comments" ON comments;
CREATE POLICY "members_select_comments_v2" ON comments FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_insert_comments" ON comments;
CREATE POLICY "members_insert_comments_v2" ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- 게스트 코멘트 정책 유지 (기존)

-- ============================================
-- 13. RLS 정책 — project_versions 업데이트 (멤버 기반)
-- ============================================
DROP POLICY IF EXISTS "members_select_versions" ON project_versions;
CREATE POLICY "members_select_versions_v2" ON project_versions FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_insert_versions" ON project_versions;
CREATE POLICY "members_insert_versions_v2" ON project_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_update_versions" ON project_versions;
CREATE POLICY "members_update_versions_v2" ON project_versions FOR UPDATE
  TO authenticated
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "members_delete_versions" ON project_versions;
CREATE POLICY "members_delete_versions_v2" ON project_versions FOR DELETE
  TO authenticated
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE project_invites;
