# Phase 7: 회원관리 + 권한 체계

## 역할 체계

| 역할 | 정의 | 로그인 |
|------|------|:---:|
| **Owner** | 프로젝트 생성자 | O |
| **Member** | 초대받은 로그인 사용자 | O |
| **Guest** | 공유 링크로 접근하는 비로그인 사용자 | X |

## 사용자 프로필

- **display_name**: 프로젝트 내 표시 이름 (UNIQUE, 중복 불가)
- 회원가입 시 또는 최초 로그인 시 설정
- Supabase `auth.users` 메타데이터 또는 별도 `profiles` 테이블에 저장

### `profiles` 테이블
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- 회원가입 trigger로 자동 생성 (display_name은 이메일 앞부분 기본값)
- 프로필 수정 UI에서 변경 가능
- UNIQUE 제약 → 동일 이름 불가, 가입/변경 시 중복 체크 필요

## 권한 매트릭스

| 기능 | Owner | Member | Guest |
|------|:---:|:---:|:---:|
| 프로젝트 삭제 | O | X | X |
| 멤버 초대 (이메일/링크) | O | O | X |
| 멤버 역할 변경 (member↔owner) | O | X | X |
| 멤버 제거 | O | X | X |
| 초대 링크 관리 (생성/비활성화/재생성) | O | O | X |
| 공유(게스트) 링크 관리 (on/off, 재생성) | O | X | X |
| 버전 추가 | O | O | X |
| 코멘트 작성 | O | O | O |
| 코멘트 해결 표시 | O | O | X |
| 프로젝트 목록에서 보임 | O | O | X |
| 프로젝트 접근 | O | O | 공유 링크만 |

## 초대 방식

### 1. 이메일 초대
- Owner 또는 Member가 이메일 입력 → DB에 초대 레코드 생성
- 해당 이메일로 가입/로그인한 유저가 자동으로 Member로 추가
- 이미 가입된 유저면 즉시 프로젝트 목록에 노출

### 2. 초대 링크 (타입 선택)
- 링크 생성 시 **멤버 초대** 또는 **게스트 공유** 중 선택
- **멤버 초대 링크** (`invite_token`):
  - 링크를 받은 사람이 가입/로그인하면 자동으로 Member로 추가
  - 프로젝트 목록에 노출됨
- **게스트 공유 링크** (`share_token`):
  - 비로그인 사용자도 접근 가능 (기존 공유 기능)
  - 코멘트 작성만 가능, 프로젝트 목록에는 안 보임
- Owner가 각 링크를 독립적으로 비활성화/재생성 가능

### 3. Owner의 접근 권한 관리
- Owner는 프로젝트 멤버의 역할을 변경할 수 있음 (member → owner, owner → member)
- Owner는 특정 멤버를 프로젝트에서 제거할 수 있음
- Owner는 초대 링크(멤버용/게스트용) 각각 on/off 및 재생성 가능

## DB 스키마 변경

### 신규: `profiles` 테이블
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 회원가입 시 자동 프로필 생성 trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 신규: `project_members` 테이블
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);
```

### 신규: `project_invites` 테이블
```sql
CREATE TABLE project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT,                    -- 이메일 초대 시
  invite_token UUID DEFAULT gen_random_uuid(),  -- 링크 초대 시
  invite_type TEXT NOT NULL CHECK (invite_type IN ('member', 'guest')) DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,  -- Owner가 비활성화 가능
  accepted_at TIMESTAMPTZ,      -- 수락 시 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 변경: `projects` 테이블
```sql
ALTER TABLE projects ADD COLUMN share_enabled BOOLEAN DEFAULT true;
ALTER TABLE projects ADD COLUMN invite_token UUID DEFAULT gen_random_uuid();
-- share_token은 기존 컬럼 유지 (게스트 공유용)
-- invite_token은 멤버 초대용 (별도)
```

## RLS 정책

```sql
-- profiles: 누구나 조회, 본인만 수정
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- projects: 멤버만 조회 가능 (+ 게스트는 share_token으로 접근)
CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  OR (share_enabled = true AND share_token IS NOT NULL)  -- 게스트 접근용
);

-- projects: owner만 수정/삭제
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
);
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
);

-- project_members: 같은 프로젝트 멤버만 조회, owner만 insert/update/delete
CREATE POLICY "members_select" ON project_members FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "members_insert" ON project_members FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "members_update" ON project_members FOR UPDATE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
);
CREATE POLICY "members_delete" ON project_members FOR DELETE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
);

-- project_invites: 멤버만 생성/조회, owner만 수정(비활성화)
CREATE POLICY "invites_select" ON project_invites FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "invites_insert" ON project_invites FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "invites_update" ON project_invites FOR UPDATE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
);
```

## UI 변경

### 프로젝트 목록 (ProjectListPage)
- 기존: 전체 projects select
- 변경: `project_members`에 본인이 있는 프로젝트만 표시
- Guest는 프로젝트 목록 없음 (공유 링크로만 접근)

### 프로젝트 설정 (신규: ProjectSettingsModal) — Owner 전용
- **멤버 탭**:
  - 멤버 목록 + 역할(Owner/Member) 표시
  - 역할 변경 드롭다운 (Owner만 조작 가능)
  - 멤버 제거 버튼 (Owner만)
- **초대 탭**:
  - 이메일 입력 초대 (Member/Owner 모두 가능)
  - 초대 링크 생성: **멤버 초대** / **게스트 공유** 타입 선택 드롭다운
  - 생성된 링크 목록 + 복사 버튼 + 비활성화 토글 (Owner만)
- **공유 탭**:
  - 게스트 공유 링크 on/off 마스터 스위치 (Owner만)
  - 공유 링크 재생성 (Owner만)

### ReviewHeader 변경
- Owner: 설정(톱니바퀴) 버튼 추가 → ProjectSettingsModal 열기
- Member: 초대 버튼 표시, 삭제/공유관리/역할변경 숨김
- Guest: 기존과 동일

### 프로필 설정 (신규: ProfileModal)
- 표시 이름 변경 (중복 불가, 실시간 중복 체크)
- 아바타 URL 입력 (선택)

## 구현 순서

| 단계 | 작업 | 규모 |
|------|------|------|
| 1 | `schema-v4.sql` 작성 (profiles, project_members, project_invites, projects 컬럼) | SQL |
| 2 | RLS 정책 v2 작성 | SQL |
| 3 | 프로필 자동 생성 trigger + 프로필 API | auth.js |
| 4 | 프로젝트 생성 시 owner → project_members 자동 insert | auth.js |
| 5 | fetchProjects를 project_members 기반으로 변경 | auth.js |
| 6 | 멤버 초대 API (이메일 + 링크, 타입 선택) | auth.js |
| 7 | 초대 수락 로직 (로그인 시 pending invite 확인) | auth.js + app.js |
| 8 | ProjectSettingsModal UI (멤버 관리 + 역할 변경 + 제거) | app.js |
| 9 | 초대 링크 타입 선택 UI + 공유 링크 on/off + 재생성 | app.js + auth.js |
| 10 | ProfileModal UI (이름 중복 체크) | app.js |
| 11 | 권한별 UI 분기 (버튼 숨김 등) | app.js |
| 12 | E2E 테스트 | - |
