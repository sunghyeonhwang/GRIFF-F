// ============================================
// GRIFF Frame — Auth Module
// ============================================

const __authApi = {
  // 회원가입
  async signUp(email, password) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return { error: { message: 'Supabase 미연결' } };
    const { data, error } = await sb.auth.signUp({ email, password });
    return { data, error };
  },

  // 로그인
  async signIn(email, password) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return { error: { message: 'Supabase 미연결' } };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
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

  // 프로젝트 목록 (멤버)
  async fetchProjects() {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[GRIFF] fetchProjects:', error); return []; }
    return data || [];
  },

  // 프로젝트 생성 (v1 자동 생성 포함)
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
    // v1 자동 생성
    if (data) {
      await sb.from('project_versions').insert({
        project_id: data.id, version_number: 1, vimeo_url: vimeoUrl,
        description: '초기 버전', is_active: true, created_by: user?.id
      });
    }
    return data;
  },

  // 프로젝트 삭제
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

  // 프로젝트 버전 목록 조회
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

  // 새 버전 추가
  async createProjectVersion(projectId, vimeoUrl, description) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const user = await this.getUser();
    // 현재 최대 version_number 조회
    const versions = await this.fetchProjectVersions(projectId);
    const nextNum = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1;
    // 기존 active 해제
    await sb.from('project_versions').update({ is_active: false }).eq('project_id', projectId);
    // 새 버전 삽입
    const { data, error } = await sb
      .from('project_versions')
      .insert({ project_id: projectId, version_number: nextNum, vimeo_url: vimeoUrl, description, is_active: true, created_by: user?.id })
      .select()
      .single();
    if (error) { console.error('[GRIFF] createVersion:', error); return null; }
    return data;
  },

  // 활성 버전 전환
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

  // share_token으로 프로젝트 조회 (게스트)
  async fetchProjectByShareToken(token) {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) return null;
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .eq('share_token', token)
      .single();
    if (error) { console.error('[GRIFF] fetchByShareToken:', error); return null; }
    return data;
  },
};

window.__griffAuth = __authApi;
