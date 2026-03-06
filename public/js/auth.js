// ============================================
// GRIFF Frame — Auth Module (v2: 권한 체계)
// ============================================

const __authApi = {
  // 회원가입
  async signUp(email, password) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return { error: { message: 'Supabase 미연결' } };
    const { data, error } = await sb.auth.signUp({ email, password });
    // 가입 성공 후 프로필 생성 보장 (trigger 실패 대비)
    if (!error && data?.user) {
      await this.ensureProfile(data.user.id, email);
    }
    return { data, error };
  },

  // 프로필 존재 보장 (trigger 실패 시 클라이언트 fallback)
  async ensureProfile(userId, email) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return;
    const { data: existing } = await sb.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!existing) {
      const baseName = email.split('@')[0];
      // 중복 시 숫자 붙이기
      let name = baseName;
      let suffix = 0;
      while (true) {
        const { data: dup } = await sb.from('profiles').select('id').eq('display_name', name).maybeSingle();
        if (!dup) break;
        suffix++;
        name = baseName + suffix;
      }
      await sb.from('profiles').insert({ id: userId, display_name: name });
    }
  },

  // 로그인
  async signIn(email, password) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return { error: { message: 'Supabase 미연결' } };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      // 프로필 존재 보장
      await this.ensureProfile(data.user.id, data.user.email);
      // 로그인 시 pending invite 확인 및 수락
      await this.acceptPendingInvites(data.user.email, data.user.id);
    }
    return { data, error };
  },

  // Magic Link
  async signInWithMagicLink(email) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return { error: { message: 'Supabase 미연결' } };
    const { data, error } = await sb.auth.signInWithOtp({ email });
    return { data, error };
  },

  // 로그아웃
  async signOut() {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  },

  // 현재 유저
  async getUser() {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },

  // 세션 변경 리스너
  onAuthStateChange(callback) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  },

  // ============================================
  // 프로필 API
  // ============================================

  // 내 프로필 조회
  async fetchProfile(userId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) { console.error('[GRIFF] fetchProfile:', error); return null; }
    return data;
  },

  // 프로필 이름 변경 (중복 체크 포함)
  async updateDisplayName(userId, newName) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return { error: 'Supabase 미연결' };
    // 중복 체크
    const { data: existing } = await sb
      .from('profiles')
      .select('id')
      .eq('display_name', newName)
      .neq('id', userId)
      .maybeSingle();
    if (existing) return { error: '이미 사용 중인 이름입니다.' };
    const { data, error } = await sb
      .from('profiles')
      .update({ display_name: newName, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) { console.error('[GRIFF] updateDisplayName:', error); return { error: error.message }; }
    return { data };
  },

  // 이름 중복 체크
  async checkDisplayName(name, excludeUserId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return false;
    let query = sb.from('profiles').select('id').eq('display_name', name);
    if (excludeUserId) query = query.neq('id', excludeUserId);
    const { data } = await query.maybeSingle();
    return !!data; // true면 중복
  },

  // ============================================
  // 프로젝트 API
  // ============================================

  // 프로젝트 목록 (project_members 기반)
  async fetchProjects() {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return [];
    // project_members를 통해 내가 속한 프로젝트만 조회
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[GRIFF] fetchProjects:', error); return []; }
    return data || [];
  },

  // 프로젝트 생성 (v1 자동 생성 + owner 등록)
  async createProject(title, vimeoUrl) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const user = await this.getUser();
    const { data, error } = await sb
      .from('projects')
      .insert({ title, vimeo_url: vimeoUrl, created_by: user?.id })
      .select()
      .single();
    if (error) { console.error('[GRIFF] createProject:', error); return null; }
    if (data && user) {
      // owner → project_members 자동 등록
      await sb.from('project_members').insert({
        project_id: data.id, user_id: user.id, role: 'owner'
      });
      // v1 자동 생성
      await sb.from('project_versions').insert({
        project_id: data.id, version_number: 1, vimeo_url: vimeoUrl,
        description: '초기 버전', is_active: true, created_by: user.id
      });
    }
    return data;
  },

  // 프로젝트 삭제 (owner만)
  async deleteProject(projectId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return false;
    const { error } = await sb
      .from('projects')
      .delete()
      .eq('id', projectId);
    if (error) { console.error('[GRIFF] deleteProject:', error); return false; }
    return true;
  },

  // ============================================
  // 멤버 관리 API
  // ============================================

  // 프로젝트 멤버 목록 (프로필 정보 포함)
  async fetchProjectMembers(projectId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return [];
    // 멤버 목록 조회
    const { data: members, error } = await sb
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) { console.error('[GRIFF] fetchMembers:', error); return []; }
    if (!members || members.length === 0) return [];
    // 각 멤버의 프로필 조회
    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });
    return members.map(m => ({
      ...m,
      profiles: profileMap[m.user_id] || null,
    }));
  },

  // 내 역할 조회
  async getMyRole(projectId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const user = await this.getUser();
    if (!user) return null;
    const { data } = await sb
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();
    return data?.role || null;
  },

  // 멤버 역할 변경 (owner만)
  async updateMemberRole(memberId, newRole) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return false;
    const { error } = await sb
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId);
    if (error) { console.error('[GRIFF] updateMemberRole:', error); return false; }
    return true;
  },

  // 멤버 제거 (owner만)
  async removeMember(memberId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return false;
    const { error } = await sb
      .from('project_members')
      .delete()
      .eq('id', memberId);
    if (error) { console.error('[GRIFF] removeMember:', error); return false; }
    return true;
  },

  // ============================================
  // 초대 API
  // ============================================

  // 이메일 초대
  async inviteByEmail(projectId, email) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const user = await this.getUser();
    // 이미 멤버인지 확인
    const { data: existingProfile } = await sb
      .from('profiles')
      .select('id')
      .eq('display_name', email.split('@')[0])
      .maybeSingle();
    // 이미 초대했는지 확인
    const { data: existingInvite } = await sb
      .from('project_invites')
      .select('id')
      .eq('project_id', projectId)
      .eq('email', email)
      .is('accepted_at', null)
      .maybeSingle();
    if (existingInvite) return { error: '이미 초대된 이메일입니다.' };

    const { data, error } = await sb
      .from('project_invites')
      .insert({
        project_id: projectId,
        email,
        invite_type: 'member',
        invited_by: user?.id
      })
      .select()
      .single();
    if (error) { console.error('[GRIFF] inviteByEmail:', error); return { error: error.message }; }

    // 이미 가입된 유저면 즉시 멤버 추가
    const { data: existingUser } = await sb.rpc('get_user_id_by_email', { target_email: email }).maybeSingle();
    if (existingUser?.id) {
      await sb.from('project_members').insert({
        project_id: projectId, user_id: existingUser.id, role: 'member', invited_by: user?.id
      }).single();
      await sb.from('project_invites').update({ accepted_at: new Date().toISOString() }).eq('id', data.id);
    }

    return { data };
  },

  // 초대 링크 생성 (member 또는 guest 타입)
  async createInviteLink(projectId, inviteType) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const user = await this.getUser();
    const { data, error } = await sb
      .from('project_invites')
      .insert({
        project_id: projectId,
        invite_type: inviteType,
        invited_by: user?.id
      })
      .select()
      .single();
    if (error) { console.error('[GRIFF] createInviteLink:', error); return null; }
    return data;
  },

  // 초대 목록 조회
  async fetchInvites(projectId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('project_invites')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[GRIFF] fetchInvites:', error); return []; }
    return data || [];
  },

  // 초대 비활성화/활성화 (owner만)
  async toggleInviteActive(inviteId, isActive) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return false;
    const { error } = await sb
      .from('project_invites')
      .update({ is_active: isActive })
      .eq('id', inviteId);
    if (error) { console.error('[GRIFF] toggleInvite:', error); return false; }
    return true;
  },

  // 초대 토큰으로 수락 (로그인 후 호출)
  async acceptInviteByToken(token) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const user = await this.getUser();
    if (!user) return null;

    const { data: invite } = await sb
      .from('project_invites')
      .select('*')
      .eq('invite_token', token)
      .eq('is_active', true)
      .is('accepted_at', null)
      .single();
    if (!invite) return null;

    if (invite.invite_type === 'member') {
      // 멤버로 추가
      const { error } = await sb.from('project_members').insert({
        project_id: invite.project_id,
        user_id: user.id,
        role: 'member',
        invited_by: invite.invited_by
      });
      if (error && error.code !== '23505') { // unique violation은 무시 (이미 멤버)
        console.error('[GRIFF] acceptInvite:', error);
        return null;
      }
      await sb.from('project_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);
    }

    // 프로젝트 정보 반환
    const { data: project } = await sb.from('projects').select('*').eq('id', invite.project_id).single();
    return { invite, project };
  },

  // 로그인 시 이메일 기반 pending invite 자동 수락
  async acceptPendingInvites(email, userId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return;
    const { data: invites } = await sb
      .from('project_invites')
      .select('*')
      .eq('email', email)
      .eq('invite_type', 'member')
      .is('accepted_at', null)
      .eq('is_active', true);
    if (!invites || invites.length === 0) return;

    for (const inv of invites) {
      await sb.from('project_members').insert({
        project_id: inv.project_id,
        user_id: userId,
        role: 'member',
        invited_by: inv.invited_by
      }).single();
      await sb.from('project_invites').update({ accepted_at: new Date().toISOString() }).eq('id', inv.id);
    }
  },

  // invite_token으로 프로젝트 조회 (게스트 공유 링크)
  async fetchProjectByInviteToken(token) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const { data: invite } = await sb
      .from('project_invites')
      .select('*, projects(*)')
      .eq('invite_token', token)
      .eq('is_active', true)
      .eq('invite_type', 'guest')
      .single();
    if (!invite) return null;
    return invite.projects;
  },

  // ============================================
  // 공유 관리 API
  // ============================================

  // 공유 링크 on/off
  async toggleShareEnabled(projectId, enabled) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return false;
    const { error } = await sb
      .from('projects')
      .update({ share_enabled: enabled })
      .eq('id', projectId);
    if (error) { console.error('[GRIFF] toggleShare:', error); return false; }
    return true;
  },

  // 공유 토큰 재생성
  async regenerateShareToken(projectId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const newToken = crypto.randomUUID();
    const { data, error } = await sb
      .from('projects')
      .update({ share_token: newToken })
      .eq('id', projectId)
      .select()
      .single();
    if (error) { console.error('[GRIFF] regenerateShareToken:', error); return null; }
    return data;
  },

  // ============================================
  // 버전 관리 API (기존 유지)
  // ============================================

  async fetchProjectVersions(projectId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: true });
    if (error) { console.error('[GRIFF] fetchVersions:', error); return []; }
    return data || [];
  },

  async createProjectVersion(projectId, vimeoUrl, description) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const user = await this.getUser();
    const versions = await this.fetchProjectVersions(projectId);
    const nextNum = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;
    await sb.from('project_versions').update({ is_active: false }).eq('project_id', projectId);
    const { data, error } = await sb
      .from('project_versions')
      .insert({ project_id: projectId, version_number: nextNum, vimeo_url: vimeoUrl, description, is_active: true, created_by: user?.id })
      .select()
      .single();
    if (error) { console.error('[GRIFF] createVersion:', error); return null; }
    return data;
  },

  async switchActiveVersion(projectId, versionId) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return false;
    await sb.from('project_versions').update({ is_active: false }).eq('project_id', projectId);
    const { error } = await sb
      .from('project_versions')
      .update({ is_active: true })
      .eq('id', versionId);
    if (error) { console.error('[GRIFF] switchVersion:', error); return false; }
    return true;
  },

  // share_token으로 프로젝트 조회 (게스트 또는 공유 링크 접근)
  async fetchProjectByShareToken(token) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .eq('share_token', token)
      .eq('share_enabled', true)
      .single();
    if (error) { console.error('[GRIFF] fetchByShareToken:', error); return null; }
    return data;
  },
};

window.__griffAuth = __authApi;
