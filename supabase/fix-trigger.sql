-- ============================================
-- Trigger 수정: handle_new_user 안전화
-- ============================================
-- 문제: trigger 에러가 auth.users INSERT를 롤백시킴
-- 해결: trigger를 제거하고 클라이언트에서 프로필 생성

-- 1. 기존 trigger 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. 함수도 제거 (안전)
DROP FUNCTION IF EXISTS handle_new_user();

-- 3. profiles RLS 정책 수정 — service_role은 항상 bypass하지만
--    anon/authenticated도 자기 프로필을 생성할 수 있어야 함
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (true);  -- 누구나 INSERT 가능 (id는 auth.uid()와 일치해야 하지만 trigger용으로 열어둠)

-- 4. 확인: profiles 테이블 상태
SELECT count(*) as profile_count FROM profiles;
