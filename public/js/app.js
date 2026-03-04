// ========================================
// React Hooks
// ========================================
const { useState, useRef, useEffect, useCallback, useMemo } = React;

// ========================================
// Supabase 초기화
// ========================================
const __sb = window.__griffSupabase?.initSupabase?.();

// 작성자명 해시 기반 결정적 색상
function getAuthorColor(authorName) {
  const colors = ['#3d8bfd', '#f59e0b', '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fb7185', '#fbbf24'];
  let hash = 0;
  for (let i = 0; i < authorName.length; i++) {
    hash = authorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// DB 코멘트 → 앱 포맷 변환
function dbToComment(row) {
  return {
    id: row.id,
    timecode: row.timecode_seconds,
    timecodeEnd: row.timecode_end_seconds || null,
    body: row.body,
    author: row.author_name,
    color: getAuthorColor(row.author_name),
    createdAt: new Date(row.created_at).toLocaleString('ko-KR'),
    resolved: row.is_resolved,
  };
}

// ========================================
// Utility Functions
// ========================================
function formatTimecode(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatFrame(seconds, fps) {
  return String(Math.floor(seconds * fps));
}

function formatTC(seconds, useFrames, fps) {
  if (useFrames) return formatFrame(seconds, fps) + 'f';
  return formatTimecode(seconds);
}

function getAuthorInitial(name) {
  return name.charAt(0);
}

function extractVimeoId(url) {
  // 비공개 영상: vimeo.com/1170147115/99811327b3 → "1170147115"
  // 일반 영상: vimeo.com/123456789 → "123456789"
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function extractVimeoHash(url) {
  // 비공개 영상 해시: vimeo.com/1170147115/99811327b3 → "99811327b3"
  const match = url.match(/vimeo\.com\/\d+\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

// ========================================
// Spinner Component
// ========================================
function Spinner({ size = 'md', text }) {
  const s = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${s} border-2 border-frame-border border-t-frame-accent rounded-full animate-spin`} />
      {text && <span className="text-[13px] text-frame-muted">{text}</span>}
    </div>
  );
}

// ========================================
// Error Banner Component
// ========================================
function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="bg-frame-danger/10 border border-frame-danger/30 text-frame-danger text-[13px] px-4 py-2.5 rounded-lg flex items-center justify-between">
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} className="text-frame-danger/60 hover:text-frame-danger ml-3">✕</button>}
    </div>
  );
}

// ========================================
// Icon Components
// ========================================
function PlayIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
}

function PauseIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
}

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function SendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

function VolumeHighIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
}

function VolumeMuteIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
}

function FullscreenIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
}

function ExitFullscreenIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>;
}

function KeyboardIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>;
}

function CompareIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/></svg>;
}

// ========================================
// Logo Component
// ========================================
function Logo({ size = 'md' }) {
  const s = size === 'lg' ? 'w-10 h-10 text-[14px]' : 'w-7 h-7 text-[11px]';
  return (
    <div className={`${s} rounded bg-frame-accent flex items-center justify-center`}>
      <span className="font-display font-bold text-white tracking-wider">GF</span>
    </div>
  );
}

// ========================================
// Login Page
// ========================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const auth = window.__griffAuth;
    let result;

    if (isSignUp) {
      result = await auth.signUp(email, password);
      if (!result.error) {
        setError('');
        setIsSignUp(false);
        // 자동 로그인 시도
        result = await auth.signIn(email, password);
      }
    } else {
      result = await auth.signIn(email, password);
    }

    setLoading(false);

    if (result.error) {
      const msg = result.error.message;
      if (msg.includes('Invalid login')) setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      else if (msg.includes('already registered')) setError('이미 등록된 이메일입니다.');
      else setError(msg);
    } else {
      onLogin(result.data?.session);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-frame-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3"><Logo size="lg" /></div>
          <h1 className="font-display font-bold text-2xl text-frame-text">GRIFF Frame</h1>
          <p className="text-[13px] text-frame-muted mt-1">영상 리뷰 협업 플랫폼</p>
        </div>

        <div className="bg-frame-surface border border-frame-border rounded-xl p-6">
          <h2 className="font-display font-semibold text-[15px] text-frame-text mb-4">{isSignUp ? '회원가입' : '로그인'}</h2>

          {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div>
              <label className="text-[12px] text-frame-muted block mb-1">이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@company.com" className="w-full bg-frame-elevated border border-frame-border rounded-md px-3 py-2.5 text-[14px] text-frame-text placeholder:text-frame-muted/40 focus:border-frame-accent transition-colors" />
            </div>
            <div>
              <label className="text-[12px] text-frame-muted block mb-1">비밀번호</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="6자 이상" className="w-full bg-frame-elevated border border-frame-border rounded-md px-3 py-2.5 text-[14px] text-frame-text placeholder:text-frame-muted/40 focus:border-frame-accent transition-colors" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-frame-accent text-white text-[14px] font-medium rounded-md hover:bg-frame-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : (isSignUp ? '가입하기' : '로그인')}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-[13px] text-frame-accent hover:underline">
              {isSignUp ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Create Project Modal
// ========================================
function CreateProjectModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vimeoId = extractVimeoId(vimeoUrl);
    if (!vimeoId) { setError('올바른 Vimeo URL을 입력하세요. (예: https://vimeo.com/123456789)'); return; }
    setLoading(true);
    setError('');
    const result = await window.__griffAuth?.createProject(title.trim(), vimeoUrl.trim());
    setLoading(false);
    if (result) {
      onCreate(result);
      onClose();
    } else {
      setError('프로젝트 생성에 실패했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-frame-elevated border border-frame-border rounded-xl p-6 w-[440px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-semibold text-[16px] text-frame-text mb-4">새 프로젝트</h3>

        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="text-[12px] text-frame-muted block mb-1">프로젝트 제목</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="예: 브랜드 필름 v3" className="w-full bg-frame-surface border border-frame-border rounded-md px-3 py-2.5 text-[14px] text-frame-text placeholder:text-frame-muted/40 focus:border-frame-accent transition-colors" />
          </div>
          <div>
            <label className="text-[12px] text-frame-muted block mb-1">Vimeo 영상 URL</label>
            <input type="url" value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} required placeholder="https://vimeo.com/123456789" className="w-full bg-frame-surface border border-frame-border rounded-md px-3 py-2.5 text-[14px] text-frame-text font-mono placeholder:text-frame-muted/40 focus:border-frame-accent transition-colors" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-[13px] text-frame-muted border border-frame-border rounded-md hover:border-frame-muted transition-colors">취소</button>
            <button type="submit" disabled={loading || !title.trim()} className="flex-1 py-2.5 bg-frame-accent text-white text-[13px] font-medium rounded-md hover:bg-frame-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================
// Project List Page
// ========================================
function ProjectListPage({ user, onSelectProject, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    window.__griffAuth?.fetchProjects().then(data => {
      setProjects(data || []);
      setLoading(false);
    });
    if (user?.id) {
      window.__griffAuth?.fetchProfile(user.id).then(p => setProfile(p));
    }
  }, []);

  const handleCreate = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const handleDelete = async (e, projectId) => {
    e.stopPropagation();
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return;
    const ok = await window.__griffAuth?.deleteProject(projectId);
    if (ok) setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  return (
    <div className="h-screen flex flex-col bg-frame-bg">
      <header className="h-14 border-b border-frame-border flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-semibold text-sm text-frame-muted tracking-wide">GRIFF FRAME</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-1.5 text-[12px] text-frame-muted hover:text-frame-text transition-colors" title="프로필 설정">
            <div className="w-6 h-6 rounded-full bg-frame-accent/20 flex items-center justify-center text-[10px] font-bold text-frame-accent">
              {(profile?.display_name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <span className="font-mono">{profile?.display_name || user?.email}</span>
          </button>
          <button onClick={onLogout} className="text-[12px] text-frame-muted hover:text-frame-text border border-frame-border rounded-md px-2.5 py-1 hover:border-frame-muted transition-colors">로그아웃</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display font-bold text-xl text-frame-text">프로젝트</h1>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-frame-accent text-white text-[13px] font-medium rounded-md hover:bg-frame-accent/80 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              새 프로젝트
            </button>
          </div>

          {loading ? (
            <div className="py-20"><Spinner text="프로젝트 불러오는 중..." /></div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-frame-elevated border border-frame-border flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-frame-muted"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </div>
              <p className="text-frame-muted text-[14px]">아직 프로젝트가 없습니다.</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-frame-accent text-[13px] hover:underline">첫 프로젝트 만들기</button>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(p => (
                <div key={p.id} onClick={() => onSelectProject(p)} className="bg-frame-surface border border-frame-border rounded-lg p-4 cursor-pointer hover:border-frame-accent/30 hover:bg-frame-accent/5 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-medium text-[15px] text-frame-text group-hover:text-frame-accent transition-colors">{p.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] font-mono text-frame-muted">{extractVimeoId(p.vimeo_url) ? `vimeo/${extractVimeoId(p.vimeo_url)}` : p.vimeo_url}</span>
                        <span className="text-[11px] text-frame-muted">{new Date(p.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-frame-muted bg-frame-elevated px-2 py-0.5 rounded">{p.share_token?.slice(0, 8)}...</span>
                      <button onClick={(e) => handleDelete(e, p.id)} className="opacity-0 group-hover:opacity-100 text-frame-muted hover:text-frame-danger transition-all p-1" title="삭제">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} user={user} profile={profile} onUpdate={(p) => setProfile(p)} />}
    </div>
  );
}

// ========================================
// Review Header
// ========================================
function ReviewHeader({ project, onExportClick, showExport, onShareClick, onBack, comments, duration, myRole, onSettingsClick, isGuest }) {
  return (
    <header className="h-14 border-b border-frame-border flex items-center justify-between px-5 flex-shrink-0">
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 group" title="프로젝트 목록">
            <Logo />
            <span className="font-display font-semibold text-sm text-frame-muted tracking-wide group-hover:text-frame-text transition-colors">GRIFF FRAME</span>
          </button>
        )}
        {!onBack && (
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-semibold text-sm text-frame-muted tracking-wide">GRIFF FRAME</span>
          </div>
        )}
        <div className="w-px h-5 bg-frame-border"/>
        <h1 className="font-display font-medium text-[15px] text-frame-text">{project.title}</h1>
        <span className="text-[11px] font-mono text-frame-muted bg-frame-elevated px-2 py-0.5 rounded">{new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
      </div>
      <div className="flex items-center gap-2">
        {!isGuest && (myRole === 'owner' || myRole === 'member') && (
          <button onClick={onShareClick} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-frame-muted hover:text-frame-text border border-frame-border rounded-md hover:border-frame-muted transition-colors">
            <ShareIcon /> 공유
          </button>
        )}
        {!isGuest && (
          <div className="relative">
            <button onClick={onExportClick} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-frame-accent/10 text-frame-accent border border-frame-accent/30 rounded-md hover:bg-frame-accent/20 transition-colors">
              <ExportIcon /> 내보내기
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M7 10l5 5 5-5z"/></svg>
            </button>
            {showExport && <ExportDropdown comments={comments} duration={duration} projectTitle={project.title} />}
          </div>
        )}
        {!isGuest && onSettingsClick && (
          <button onClick={onSettingsClick} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-frame-muted hover:text-frame-text border border-frame-border rounded-md hover:border-frame-muted transition-colors" title="프로젝트 설정">
            <SettingsIcon />
          </button>
        )}
      </div>
    </header>
  );
}

// ========================================
// Export Dropdown
// ========================================
function ExportDropdown({ comments, duration, projectTitle }) {
  const exp = window.__griffExport;

  const formats = [
    { label: 'Premiere Pro XML', desc: '.xml 마커', icon: 'Pr', action: () => exp?.exportPremiereXML(comments, projectTitle, duration) },
    { label: 'Final Cut Pro', desc: '.fcpxml', icon: 'Fc', action: () => exp?.exportFCPXML(comments, projectTitle, duration) },
    { label: 'DaVinci Resolve', desc: '.edl 마커', icon: 'Dv', action: () => exp?.exportDaVinciEDL(comments, projectTitle) },
    { label: 'CSV', desc: '.csv 스프레드시트', icon: 'Cs', action: () => exp?.exportCSV(comments, projectTitle) },
  ];

  return (
    <div className="export-menu absolute top-full right-0 mt-1 w-56 bg-frame-elevated border border-frame-border rounded-lg shadow-2xl shadow-black/50 overflow-hidden z-50">
      <div className="px-3 py-2 border-b border-frame-border">
        <span className="text-[11px] font-mono text-frame-muted uppercase tracking-wider">Export Format</span>
      </div>
      {formats.map((f, i) => (
        <button key={i} onClick={f.action} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-frame-accent/10 transition-colors text-left group">
          <span className="w-7 h-7 rounded bg-frame-surface border border-frame-border flex items-center justify-center text-[10px] font-mono font-bold text-frame-muted group-hover:text-frame-accent group-hover:border-frame-accent/30 transition-colors">{f.icon}</span>
          <div>
            <div className="text-[13px] text-frame-text">{f.label}</div>
            <div className="text-[11px] text-frame-muted">{f.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ========================================
// Video Player Component
// ========================================
function VideoPlayer({ vimeoId, vimeoUrl, currentTime, isPlaying, onPlayPause, playbackRate, onRateChange, onTimeUpdate, onDurationReady, duration, isEnded, onEnded, onError, volume, onVolumeChange, isMuted, onMuteToggle, playerRefOut, hideControls, tc }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);

  // 콜백 refs (stale closure 방지)
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onDurationReadyRef = useRef(onDurationReady);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { onDurationReadyRef.current = onDurationReady; }, [onDurationReady]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // 영상 소스 키 (url 또는 id)
  const playerKey = vimeoUrl || vimeoId;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 기존 플레이어 정리 + DOM 클리어
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch(e) {}
      playerRef.current = null;
      setPlayerReady(false);
    }
    // 이전 iframe 잔여물 제거
    while (container.firstChild) container.removeChild(container.firstChild);

    const playerOpts = {
      width: '100%',
      responsive: true,
      byline: false,
      title: false,
      portrait: false,
      controls: false,
      keyboard: false,
    };
    if (vimeoUrl) {
      playerOpts.url = vimeoUrl;
    } else {
      playerOpts.id = vimeoId;
    }
    const player = new Vimeo.Player(container, playerOpts);

    playerRef.current = player;

    player.ready().then(() => {
      setPlayerReady(true);
      player.getDuration().then(dur => {
        if (onDurationReadyRef.current) onDurationReadyRef.current(dur);
      });
      // ready 후 이벤트 등록
      player.on('timeupdate', (data) => {
        if (onTimeUpdateRef.current) onTimeUpdateRef.current(data.seconds);
      });
      player.on('ended', () => {
        if (onEndedRef.current) onEndedRef.current();
      });
    }).catch(err => {
      console.error('[GRIFF] Player ready failed:', err);
      if (onErrorRef.current) onErrorRef.current('Vimeo 영상을 로드할 수 없습니다. URL을 확인해주세요.');
    });

    return () => {
      try { player.destroy(); } catch(e) {}
      playerRef.current = null;
    };
  }, [playerKey]);

  useEffect(() => {
    if (!playerRef.current || !playerReady) return;
    if (isPlaying) {
      playerRef.current.play().catch(() => {});
    } else {
      playerRef.current.pause().catch(() => {});
    }
  }, [isPlaying, playerReady]);

  useEffect(() => {
    if (!playerRef.current || !playerReady) return;
    playerRef.current.setPlaybackRate(playbackRate).catch(() => {});
  }, [playbackRate, playerReady]);

  useEffect(() => {
    // 전역 + ref 양쪽 모두 등록
    window.__griffPlayer = playerRef.current;
    if (playerRefOut) playerRefOut.current = playerRef.current;
  }, [playerReady]);

  useEffect(() => {
    if (!playerRef.current || !playerReady) return;
    playerRef.current.setVolume(isMuted ? 0 : volume).catch(() => {});
  }, [volume, isMuted, playerReady]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-0">
      <div ref={containerRef} className="w-full h-full" />

      {!playerReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-frame-surface/50">
          <Spinner text="영상 로딩 중..." />
        </div>
      )}

      {isEnded && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-frame-resolve/20 border-2 border-frame-resolve flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-frame-resolve">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="font-display font-semibold text-frame-text text-lg">영상 재생 완료</p>
            <p className="text-frame-muted text-sm mt-1">코멘트를 확인하고 내보내기 해주세요</p>
            <button onClick={onPlayPause} className="mt-4 px-4 py-2 bg-frame-accent text-white text-sm rounded-md hover:bg-frame-accent/80 transition-colors">
              처음부터 다시 재생
            </button>
          </div>
        </div>
      )}

      {!hideControls && (
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
          <span className="font-mono text-[13px] text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">{(tc || formatTimecode)(currentTime)}</span>
          <span className="text-white/30 text-xs">/</span>
          <span className="font-mono text-[13px] text-white/40">{(tc || formatTimecode)(duration)}</span>
        </div>
      )}

      {!hideControls && (
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <div className="flex items-center gap-1">
            {[0.5, 1, 1.5, 2].map(rate => (
              <button key={rate} onClick={() => onRateChange(rate)} className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${playbackRate === rate ? 'bg-frame-accent text-white' : 'bg-black/40 text-white/50 hover:text-white/80 backdrop-blur-sm'}`}>
                {rate}x
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded px-2 py-1">
            <button onClick={onMuteToggle} className="text-white/70 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={e => { if (isMuted) onMuteToggle(); onVolumeChange(parseFloat(e.target.value)); }} className="w-16 h-1 accent-frame-accent cursor-pointer" />
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// Timeline Component
// ========================================
function Timeline({ comments, currentTime, duration, activeCommentId, onMarkerClick, onSeek, onPlayPause, isPlaying, isFullscreen, onFullscreenToggle, tc, onTcToggle, onRangeSelect, pendingRange, onSkip }) {
  const timelineRef = useRef(null);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 드래그 선택 state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const dragStartX = useRef(null);

  const pctToTime = (clientX) => {
    if (!timelineRef.current || duration <= 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    return pct * duration;
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    dragStartX.current = e.clientX;
    const time = pctToTime(e.clientX);
    setDragStart(time);
    setDragEnd(time);
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      setDragEnd(pctToTime(e.clientX));
    };
    const handleMouseUp = (e) => {
      setIsDragging(false);
      const dist = Math.abs(e.clientX - (dragStartX.current || 0));
      if (dist < 5) {
        // 짧은 클릭 → seek
        const time = pctToTime(e.clientX);
        onSeek(time);
      } else {
        // 드래그 → 구간 선택
        const endTime = pctToTime(e.clientX);
        const start = Math.min(dragStart, endTime);
        const end = Math.max(dragStart, endTime);
        if (onRangeSelect && end - start > 0.5) {
          onRangeSelect(start, end);
        }
      }
      setDragStart(null);
      setDragEnd(null);
      dragStartX.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, dragStart, duration, onSeek, onRangeSelect]);

  // 드래그 중 영역 계산
  const dragLeft = isDragging && dragStart != null && dragEnd != null ? Math.min(dragStart, dragEnd) / duration * 100 : 0;
  const dragWidth = isDragging && dragStart != null && dragEnd != null ? Math.abs(dragEnd - dragStart) / duration * 100 : 0;

  // pendingRange(확정된 선택 구간) 영역 계산
  const pendingLeft = pendingRange && duration > 0 ? (pendingRange.start / duration) * 100 : 0;
  const pendingWidth = pendingRange && duration > 0 ? ((pendingRange.end - pendingRange.start) / duration) * 100 : 0;

  return (
    <div className="mt-3 px-1 flex-shrink-0">
      <div className="flex justify-between mb-1">
        <span className="font-mono text-[10px] text-frame-muted cursor-pointer hover:text-frame-accent transition-colors select-none" onClick={onTcToggle} title="클릭하여 타임코드/프레임 전환">{(tc || formatTimecode)(currentTime)}</span>
        <span className="font-mono text-[10px] text-frame-muted cursor-pointer hover:text-frame-accent transition-colors select-none" onClick={onTcToggle} title="클릭하여 타임코드/프레임 전환">{(tc || formatTimecode)(duration)}</span>
      </div>

      <div ref={timelineRef} className="relative h-8 bg-frame-surface rounded cursor-pointer group select-none" onMouseDown={handleMouseDown}>
        <div className="absolute top-0 left-0 h-full bg-frame-accent/10 rounded-l transition-all" style={{ width: `${progress}%` }} />

        <div className="absolute inset-0 flex items-center px-1 opacity-30">
          {Array.from({ length: 80 }, (_, i) => {
            const h = Math.sin(i * 0.3) * 30 + Math.cos(i * 0.7) * 20 + 50;
            return <div key={i} className="flex-1 mx-px rounded-sm bg-frame-muted/30" style={{ height: `${h}%`, alignSelf: 'center' }} />;
          })}
        </div>

        {/* 확정된 구간 선택(pendingRange) 표시 — 드래그 종료 후에도 유지 */}
        {!isDragging && pendingRange && pendingWidth > 0 && (
          <div className="absolute top-0 h-full rounded z-15" style={{ left: `${pendingLeft}%`, width: `${pendingWidth}%` }}>
            <div className="absolute inset-0 bg-frame-accent/25 border-2 border-frame-accent/60 rounded" />
            {/* 시작/끝 핸들 */}
            <div className="absolute left-0 top-0 h-full w-0.5 bg-frame-accent" />
            <div className="absolute right-0 top-0 h-full w-0.5 bg-frame-accent" />
          </div>
        )}

        {/* 드래그 중 실시간 구간 표시 */}
        {isDragging && dragWidth > 0.3 && (
          <div className="absolute top-0 h-full bg-frame-accent/25 border-2 border-frame-accent/50 rounded z-15" style={{ left: `${dragLeft}%`, width: `${dragWidth}%` }} />
        )}

        <div className="playhead absolute top-0 h-full w-0.5 bg-frame-accent z-20 glow-line" style={{ left: `${progress}%` }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-frame-accent border-2 border-frame-bg" />
        </div>

        {comments.map(comment => {
          const pos = duration > 0 ? (comment.timecode / duration) * 100 : 0;
          const isActive = comment.id === activeCommentId;
          const hasRange = comment.timecodeEnd != null && duration > 0;
          const rangeWidth = hasRange ? ((comment.timecodeEnd - comment.timecode) / duration) * 100 : 0;

          return hasRange ? (
            /* 구간 코멘트: 범위 바 표시 */
            <div key={comment.id} className="marker-group absolute top-0 h-full z-10 cursor-pointer" style={{ left: `${pos}%`, width: `${Math.max(rangeWidth, 0.5)}%` }} onClick={(e) => { e.stopPropagation(); onMarkerClick(comment.id); }}>
              <div className={`absolute top-0.5 bottom-0.5 left-0 right-0 rounded-sm transition-all ${isActive ? 'border-2 border-frame-accent' : 'border border-frame-accent/40 hover:border-frame-accent/70'}`} style={{ backgroundColor: isActive ? `${comment.color}55` : `${comment.color}40` }} />
              {/* 시작/끝 세로선 */}
              <div className="absolute left-0 top-0 h-full w-0.5 rounded" style={{ backgroundColor: comment.color }} />
              <div className="absolute right-0 top-0 h-full w-0.5 rounded" style={{ backgroundColor: comment.color }} />
              <div className="marker-tooltip absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-frame-elevated border border-frame-border rounded-md px-2.5 py-1.5 shadow-xl shadow-black/50 whitespace-nowrap z-30">
                <div className="text-[11px] font-mono text-frame-accent">{(tc || formatTimecode)(comment.timecode)} — {(tc || formatTimecode)(comment.timecodeEnd)}</div>
                <div className="text-[11px] text-frame-text mt-0.5 max-w-[200px] truncate">{comment.body}</div>
                <div className="text-[10px] text-frame-muted mt-0.5">{comment.author}</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-frame-border" />
              </div>
            </div>
          ) : (
            /* 단일 포인트 코멘트: 기존 점 마커 */
            <div key={comment.id} className="marker-group absolute top-0 h-full z-10" style={{ left: `${pos}%` }} onClick={(e) => { e.stopPropagation(); onMarkerClick(comment.id); }}>
              <div className={`absolute top-1 bottom-1 w-0.5 rounded transition-all ${isActive ? 'bg-frame-accent w-1 glow-line' : 'bg-frame-muted/60 hover:bg-frame-accent'}`} style={{ left: '-1px' }} />
              <div className={`absolute bottom-0 w-2 h-2 rounded-full transition-all -translate-x-1/2 ${isActive ? 'bg-frame-accent scale-150' : 'hover:scale-125'}`} style={{ backgroundColor: isActive ? undefined : comment.color }} />
              <div className="marker-tooltip absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-frame-elevated border border-frame-border rounded-md px-2.5 py-1.5 shadow-xl shadow-black/50 whitespace-nowrap z-30">
                <div className="text-[11px] font-mono text-frame-accent">{(tc || formatTimecode)(comment.timecode)}</div>
                <div className="text-[11px] text-frame-text mt-0.5 max-w-[200px] truncate">{comment.body}</div>
                <div className="text-[10px] text-frame-muted mt-0.5">{comment.author}</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-frame-border" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative flex items-center justify-center gap-3 mt-3">
        <button onClick={() => onSkip && onSkip(-5)} className="text-frame-muted hover:text-frame-text transition-colors flex items-center gap-0.5 text-[11px] font-mono" title="5초 뒤로 (←)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
          5s
        </button>
        <button onClick={onPlayPause} className="w-9 h-9 rounded-full bg-frame-accent flex items-center justify-center hover:bg-frame-accent/80 transition-colors">
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button onClick={() => onSkip && onSkip(10)} className="text-frame-muted hover:text-frame-text transition-colors flex items-center gap-0.5 text-[11px] font-mono" title="10초 앞으로 (→)">
          10s
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        </button>

        <div className="absolute right-0 flex items-center gap-2">
          <ShortcutHelpTooltip />
          <button onClick={onFullscreenToggle} className="text-frame-muted hover:text-frame-text transition-colors p-1" title="풀스크린 (F)">
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Shortcut Help Tooltip
// ========================================
function ShortcutHelpTooltip() {
  const [show, setShow] = useState(false);
  const shortcuts = [
    { key: 'Space', desc: '재생/일시정지' },
    { key: '← / →', desc: '5초 뒤로/앞으로' },
    { key: '↑ / ↓', desc: '볼륨 ±10%' },
    { key: 'M', desc: '뮤트 토글' },
    { key: 'F', desc: '풀스크린 토글' },
  ];
  return (
    <div className="relative">
      <button onClick={() => setShow(!show)} className="text-frame-muted hover:text-frame-text transition-colors p-1" title="키보드 단축키">
        <KeyboardIcon />
      </button>
      {show && (
        <div className="absolute bottom-full right-0 mb-2 w-52 bg-frame-elevated border border-frame-border rounded-lg shadow-2xl shadow-black/50 p-3 z-50">
          <div className="text-[11px] font-mono text-frame-muted uppercase tracking-wider mb-2">단축키</div>
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1">
              <kbd className="text-[11px] font-mono bg-frame-surface border border-frame-border rounded px-1.5 py-0.5 text-frame-accent">{s.key}</kbd>
              <span className="text-[11px] text-frame-muted">{s.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================
// Comment Item Component
// ========================================
function CommentItem({ comment, isActive, onClick, onResolve, tc, searchQuery, highlightText }) {
  const ref = useRef(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      ref.current.classList.add('comment-highlight');
      const timer = setTimeout(() => ref.current?.classList.remove('comment-highlight'), 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const timecodeDisplay = comment.timecodeEnd
    ? `${(tc || formatTimecode)(comment.timecode)} — ${(tc || formatTimecode)(comment.timecodeEnd)}`
    : (tc || formatTimecode)(comment.timecode);

  const bodyContent = searchQuery && highlightText ? highlightText(comment.body, searchQuery) : comment.body;
  const authorContent = searchQuery && highlightText ? highlightText(comment.author, searchQuery) : comment.author;

  return (
    <div ref={ref} onClick={onClick} className={`px-4 py-3 cursor-pointer transition-all border-l-2 ${isActive ? 'border-l-frame-accent bg-frame-accent/5' : 'border-l-transparent hover:bg-frame-elevated/50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white" style={{ backgroundColor: comment.color }}>
            {getAuthorInitial(comment.author)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-frame-text">{authorContent}</span>
              <span className="font-mono text-[11px] text-frame-accent bg-frame-accent/10 px-1.5 py-0 rounded">{timecodeDisplay}</span>
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }} className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${comment.resolved ? 'bg-frame-resolve/20 border-frame-resolve text-frame-resolve' : 'border-frame-border text-transparent hover:border-frame-muted hover:text-frame-muted'}`} title={comment.resolved ? '해결됨' : '해결로 표시'}>
          <CheckIcon />
        </button>
      </div>
      <p className={`text-[13px] mt-1.5 ml-8 leading-relaxed ${comment.resolved ? 'text-frame-muted line-through' : 'text-frame-text/80'}`}>{bodyContent}</p>
      <span className="text-[10px] text-frame-muted/60 ml-8 mt-1 block">{comment.createdAt}</span>
    </div>
  );
}

// ========================================
// Comment Panel Component
// ========================================
function CommentPanel({ comments, activeCommentId, onCommentClick, onResolve, onAddComment, currentTime, guestName, tc, pendingRange, onClearRange }) {
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState(guestName || '나');
  const inputRef = useRef(null);
  const resolvedCount = comments.filter(c => c.resolved).length;

  // 필터 state
  const [filter, setFilter] = useState({ type: 'all' });
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  // 검색 state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // 작성자 목록 (동적)
  const authors = useMemo(() => [...new Set(comments.map(c => c.author))], [comments]);

  // 필터 적용
  const filtered = useMemo(() => {
    let list = comments;
    if (filter.type === 'unresolved') list = list.filter(c => !c.resolved);
    else if (filter.type === 'resolved') list = list.filter(c => c.resolved);
    else if (filter.type === 'author') list = list.filter(c => c.author === filter.value);
    // 검색 적용
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c => c.body.toLowerCase().includes(q) || c.author.toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.timecode - b.timecode);
  }, [comments, filter, searchQuery]);

  const filterLabel = filter.type === 'all' ? '전체' : filter.type === 'unresolved' ? '미해결' : filter.type === 'resolved' ? '해결됨' : filter.value;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const payload = { body: inputText.trim(), author: authorName || '익명', timecode: currentTime };
    if (pendingRange) {
      payload.timecode = pendingRange.start;
      payload.timecodeEnd = pendingRange.end;
    }
    onAddComment(payload);
    setInputText('');
    inputRef.current?.focus();
  };

  // 검색어 하이라이트 헬퍼
  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? React.createElement('mark', { key: i, className: 'bg-frame-accent/30 text-frame-text rounded px-0.5' }, part) : part
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-frame-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-[14px] text-frame-text">코멘트</h2>
            <span className="text-[11px] text-frame-muted bg-frame-elevated px-1.5 py-0.5 rounded-full font-mono">{comments.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* 검색 토글 */}
            <button onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }} className={`p-1 rounded transition-colors ${showSearch ? 'text-frame-accent bg-frame-accent/10' : 'text-frame-muted hover:text-frame-text'}`} title="검색">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {/* 필터 드롭다운 */}
            <div className="relative">
              <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${filter.type !== 'all' ? 'text-frame-accent bg-frame-accent/10 border border-frame-accent/30' : 'text-frame-muted hover:text-frame-text border border-transparent'}`}>
                {filterLabel}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                {filter.type !== 'all' && (
                  <span onClick={(e) => { e.stopPropagation(); setFilter({ type: 'all' }); setShowFilterMenu(false); }} className="ml-0.5 hover:text-frame-text">x</span>
                )}
              </button>
              {showFilterMenu && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-frame-elevated border border-frame-border rounded-lg shadow-2xl shadow-black/50 z-50 py-1">
                  {[
                    { type: 'all', label: '전체' },
                    { type: 'unresolved', label: '미해결만' },
                    { type: 'resolved', label: '해결됨만' },
                  ].map(opt => (
                    <button key={opt.type} onClick={() => { setFilter({ type: opt.type }); setShowFilterMenu(false); }} className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${filter.type === opt.type ? 'text-frame-accent bg-frame-accent/10' : 'text-frame-text hover:bg-frame-elevated'}`}>
                      {opt.label}
                    </button>
                  ))}
                  {authors.length > 0 && (
                    <>
                      <div className="border-t border-frame-border my-1" />
                      <div className="px-3 py-1 text-[10px] text-frame-muted uppercase tracking-wider">작성자</div>
                      {authors.map(a => (
                        <button key={a} onClick={() => { setFilter({ type: 'author', value: a }); setShowFilterMenu(false); }} className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 transition-colors ${filter.type === 'author' && filter.value === a ? 'text-frame-accent bg-frame-accent/10' : 'text-frame-text hover:bg-frame-elevated'}`}>
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: getAuthorColor(a) }}>{getAuthorInitial(a)}</span>
                          {a}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-frame-muted">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-frame-resolve inline-block" />{resolvedCount}</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-frame-amber inline-block" />{comments.length - resolvedCount}</span>
            </div>
          </div>
        </div>

        {/* 검색 바 */}
        {showSearch && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 relative">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="코멘트 검색..." autoFocus className="w-full bg-frame-elevated border border-frame-border rounded-md pl-7 pr-3 py-1.5 text-[12px] text-frame-text placeholder:text-frame-muted/50 focus:border-frame-accent transition-colors" />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2 top-1/2 -translate-y-1/2 text-frame-muted"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            {searchQuery && <span className="text-[11px] text-frame-muted whitespace-nowrap">{filtered.length}건 일치</span>}
          </div>
        )}
      </div>

      {/* 코멘트 목록 */}
      <div className="flex-1 overflow-y-auto divide-y divide-frame-border/50">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-frame-muted">
            <p className="text-[13px]">{comments.length === 0 ? '아직 코멘트가 없습니다.' : '일치하는 코멘트가 없습니다.'}</p>
            <p className="text-[11px] mt-1">{comments.length === 0 ? '영상을 재생하고 피드백을 남겨보세요.' : '필터 또는 검색어를 변경해보세요.'}</p>
          </div>
        ) : (
          filtered.map(comment => (
            <CommentItem key={comment.id} comment={comment} isActive={comment.id === activeCommentId} onClick={() => onCommentClick(comment.id)} onResolve={onResolve} tc={tc} searchQuery={searchQuery} highlightText={highlightText} />
          ))
        )}
      </div>

      {/* 코멘트 입력 폼 */}
      <form onSubmit={handleSubmit} className="border-t border-frame-border p-3 flex-shrink-0 bg-frame-surface/50">
        <div className="flex items-center gap-2 mb-2">
          {pendingRange ? (
            <>
              <span className="font-mono text-[11px] text-frame-accent bg-frame-accent/10 px-1.5 py-0.5 rounded">
                {(tc || formatTimecode)(pendingRange.start)} — {(tc || formatTimecode)(pendingRange.end)}
              </span>
              <span className="text-[11px] text-frame-muted">구간 코멘트</span>
              <button type="button" onClick={onClearRange} className="text-[10px] text-frame-muted hover:text-frame-text border border-frame-border rounded px-1.5 py-0.5 transition-colors">구간 해제</button>
            </>
          ) : (
            <>
              <span className="font-mono text-[11px] text-frame-accent bg-frame-accent/10 px-1.5 py-0.5 rounded">{(tc || formatTimecode)(currentTime)}</span>
              <span className="text-[11px] text-frame-muted">에 코멘트 추가</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <input ref={inputRef} type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="피드백을 입력하세요..." className="flex-1 bg-frame-elevated border border-frame-border rounded-md px-3 py-2 text-[13px] text-frame-text placeholder:text-frame-muted/50 focus:border-frame-accent transition-colors" />
          <button type="submit" disabled={!inputText.trim()} className="w-9 h-9 rounded-md bg-frame-accent flex items-center justify-center hover:bg-frame-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

// ========================================
// Share Modal Component
// ========================================
function ShareModal({ onClose, shareToken, versions }) {
  const [copied, setCopied] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('');
  const baseUrl = `${window.location.origin}${window.location.pathname}?share=${shareToken}`;
  const shareUrl = selectedVersion ? `${baseUrl}&v=${selectedVersion}` : baseUrl;

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-frame-elevated border border-frame-border rounded-xl p-5 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-semibold text-[15px] text-frame-text mb-1">공유 링크</h3>
        <p className="text-[12px] text-frame-muted mb-4">링크를 받은 사람은 이름 입력 후 코멘트를 남길 수 있습니다.</p>

        {versions && versions.length > 0 && (
          <div className="mb-3">
            <label className="text-[12px] text-frame-muted block mb-1">기본 표시 버전</label>
            <select value={selectedVersion} onChange={e => { setSelectedVersion(e.target.value); setCopied(false); }} className="w-full bg-frame-surface border border-frame-border rounded-md px-3 py-2 text-[13px] text-frame-text font-mono">
              <option value="">최신 활성 버전</option>
              {versions.map(v => (
                <option key={v.id} value={v.version_number}>v{v.version_number}{v.description ? ` — ${v.description}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <input readOnly value={shareUrl} className="flex-1 bg-frame-surface border border-frame-border rounded-md px-3 py-2 text-[13px] text-frame-text font-mono" />
          <button onClick={handleCopy} className={`px-3 py-2 rounded-md text-[13px] font-medium transition-all ${copied ? 'bg-frame-resolve/20 text-frame-resolve border border-frame-resolve/30' : 'bg-frame-accent text-white hover:bg-frame-accent/80'}`}>
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2 text-[13px] text-frame-muted hover:text-frame-text border border-frame-border rounded-md hover:border-frame-muted transition-colors">닫기</button>
      </div>
    </div>
  );
}

// ========================================
// Settings Icon Component
// ========================================
function SettingsIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}

// ========================================
// Profile Modal
// ========================================
function ProfileModal({ onClose, user, profile, onUpdate }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [nameAvailable, setNameAvailable] = useState(null);
  const checkTimerRef = useRef(null);

  const handleNameChange = (val) => {
    setDisplayName(val);
    setNameAvailable(null);
    setError('');
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    if (val.trim() && val.trim() !== profile?.display_name) {
      setChecking(true);
      checkTimerRef.current = setTimeout(async () => {
        const isDup = await window.__griffAuth?.checkDisplayName(val.trim(), user?.id);
        setNameAvailable(!isDup);
        setChecking(false);
      }, 500);
    } else {
      setChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    setError('');
    const result = await window.__griffAuth?.updateDisplayName(user.id, displayName.trim());
    setLoading(false);
    if (result?.error) { setError(result.error); }
    else { onUpdate(result.data); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-frame-elevated border border-frame-border rounded-xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-semibold text-[16px] text-frame-text mb-4">프로필 설정</h3>
        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
        <form onSubmit={handleSubmit} className="mt-2 space-y-3">
          <div>
            <label className="text-[12px] text-frame-muted block mb-1">이메일</label>
            <input readOnly value={user?.email || ''} className="w-full bg-frame-surface border border-frame-border rounded-md px-3 py-2.5 text-[13px] text-frame-muted font-mono" />
          </div>
          <div>
            <label className="text-[12px] text-frame-muted block mb-1">표시 이름</label>
            <div className="relative">
              <input type="text" value={displayName} onChange={e => handleNameChange(e.target.value)} required className="w-full bg-frame-surface border border-frame-border rounded-md px-3 py-2.5 text-[14px] text-frame-text placeholder:text-frame-muted/40 focus:border-frame-accent transition-colors pr-8" />
              {checking && <div className="absolute right-2.5 top-1/2 -translate-y-1/2"><Spinner size="sm" /></div>}
              {nameAvailable === true && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-frame-resolve text-[12px]">&#10003;</span>}
              {nameAvailable === false && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-frame-danger text-[12px]">&#10007;</span>}
            </div>
            {nameAvailable === false && <p className="text-[11px] text-frame-danger mt-1">이미 사용 중인 이름입니다.</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-[13px] text-frame-muted border border-frame-border rounded-md hover:border-frame-muted transition-colors">취소</button>
            <button type="submit" disabled={loading || nameAvailable === false || checking} className="flex-1 py-2.5 bg-frame-accent text-white text-[13px] font-medium rounded-md hover:bg-frame-accent/80 disabled:opacity-50 transition-all">
              {loading ? <Spinner size="sm" /> : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================
// Project Settings Modal (멤버/초대/공유)
// ========================================
function ProjectSettingsModal({ onClose, project, myRole, onProjectUpdate }) {
  const [tab, setTab] = useState('members'); // members | invites | share
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLinkType, setInviteLinkType] = useState('member');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const isOwner = myRole === 'owner';

  useEffect(() => {
    Promise.all([
      window.__griffAuth?.fetchProjectMembers(project.id),
      window.__griffAuth?.fetchInvites(project.id),
    ]).then(([m, i]) => {
      setMembers(m || []);
      setInvites(i || []);
      setLoading(false);
    });
  }, [project.id]);

  const handleInviteByEmail = async (e) => {
    e.preventDefault();
    setInviteError(''); setInviteSuccess('');
    if (!inviteEmail.trim()) return;
    const result = await window.__griffAuth?.inviteByEmail(project.id, inviteEmail.trim());
    if (result?.error) { setInviteError(typeof result.error === 'string' ? result.error : result.error.message || '초대 실패'); }
    else {
      setInviteSuccess(`${inviteEmail}에 초대를 보냈습니다.`);
      setInviteEmail('');
      const inv = await window.__griffAuth?.fetchInvites(project.id);
      setInvites(inv || []);
    }
  };

  const handleCreateLink = async () => {
    const inv = await window.__griffAuth?.createInviteLink(project.id, inviteLinkType);
    if (inv) {
      setInvites(prev => [inv, ...prev]);
      const url = `${window.location.origin}${window.location.pathname}?invite=${inv.invite_token}`;
      navigator.clipboard?.writeText(url);
      setInviteSuccess('초대 링크가 클립보드에 복사되었습니다.');
      setTimeout(() => setInviteSuccess(''), 3000);
    }
  };

  const handleToggleInvite = async (inviteId, isActive) => {
    const ok = await window.__griffAuth?.toggleInviteActive(inviteId, !isActive);
    if (ok) setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, is_active: !isActive } : i));
  };

  const handleRoleChange = async (memberId, newRole) => {
    const ok = await window.__griffAuth?.updateMemberRole(memberId, newRole);
    if (ok) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  };

  const handleRemoveMember = async (memberId, displayName) => {
    if (!confirm(`${displayName}님을 프로젝트에서 제거하시겠습니까?`)) return;
    const ok = await window.__griffAuth?.removeMember(memberId);
    if (ok) setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleToggleShare = async () => {
    const newVal = !project.share_enabled;
    const ok = await window.__griffAuth?.toggleShareEnabled(project.id, newVal);
    if (ok) onProjectUpdate({ ...project, share_enabled: newVal });
  };

  const handleRegenShareToken = async () => {
    if (!confirm('공유 링크를 재생성하면 기존 링크가 무효화됩니다. 계속하시겠습니까?')) return;
    const updated = await window.__griffAuth?.regenerateShareToken(project.id);
    if (updated) onProjectUpdate(updated);
  };

  const tabs = [
    { id: 'members', label: '멤버', count: members.length },
    { id: 'invites', label: '초대' },
    { id: 'share', label: '공유' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-frame-elevated border border-frame-border rounded-xl w-[520px] shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-display font-semibold text-[16px] text-frame-text">프로젝트 설정</h3>
          <button onClick={onClose} className="text-frame-muted hover:text-frame-text transition-colors">&#10005;</button>
        </div>

        <div className="flex gap-1 px-5 border-b border-frame-border">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-[13px] border-b-2 transition-colors ${tab === t.id ? 'border-frame-accent text-frame-accent' : 'border-transparent text-frame-muted hover:text-frame-text'}`}>
              {t.label}{t.count != null ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-8"><Spinner text="로딩..." /></div>
          ) : tab === 'members' ? (
            <div className="space-y-2">
              {members.map(m => {
                const name = m.profiles?.display_name || '(알수없음)';
                const isMe = m.user_id === project.created_by; // rough check
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-frame-surface border border-frame-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-frame-accent/20 flex items-center justify-center text-[13px] font-bold text-frame-accent">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[14px] text-frame-text">{name}</span>
                        <span className={`ml-2 text-[11px] font-mono px-1.5 py-0.5 rounded ${m.role === 'owner' ? 'bg-frame-accent/20 text-frame-accent' : 'bg-frame-elevated text-frame-muted'}`}>{m.role}</span>
                      </div>
                    </div>
                    {isOwner && m.role !== 'owner' && (
                      <div className="flex items-center gap-2">
                        <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)} className="bg-frame-elevated border border-frame-border rounded px-2 py-1 text-[11px] text-frame-text">
                          <option value="member">Member</option>
                          <option value="owner">Owner</option>
                        </select>
                        <button onClick={() => handleRemoveMember(m.id, name)} className="text-frame-muted hover:text-frame-danger text-[11px] transition-colors" title="제거">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    )}
                    {isOwner && m.role === 'owner' && (
                      <span className="text-[11px] text-frame-muted">프로젝트 소유자</span>
                    )}
                  </div>
                );
              })}
              {members.length === 0 && <p className="text-[13px] text-frame-muted text-center py-4">멤버가 없습니다.</p>}
            </div>
          ) : tab === 'invites' ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-[13px] font-medium text-frame-text mb-2">이메일로 초대</h4>
                <form onSubmit={handleInviteByEmail} className="flex gap-2">
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@company.com" className="flex-1 bg-frame-surface border border-frame-border rounded-md px-3 py-2 text-[13px] text-frame-text placeholder:text-frame-muted/40 focus:border-frame-accent transition-colors" />
                  <button type="submit" className="px-3 py-2 bg-frame-accent text-white text-[13px] rounded-md hover:bg-frame-accent/80 transition-colors">초대</button>
                </form>
              </div>

              <div>
                <h4 className="text-[13px] font-medium text-frame-text mb-2">초대 링크 생성</h4>
                <div className="flex gap-2">
                  <select value={inviteLinkType} onChange={e => setInviteLinkType(e.target.value)} className="bg-frame-surface border border-frame-border rounded-md px-3 py-2 text-[13px] text-frame-text">
                    <option value="member">멤버 초대</option>
                    <option value="guest">게스트 공유</option>
                  </select>
                  <button onClick={handleCreateLink} className="px-3 py-2 bg-frame-accent/10 text-frame-accent border border-frame-accent/30 text-[13px] rounded-md hover:bg-frame-accent/20 transition-colors">링크 생성</button>
                </div>
              </div>

              {inviteError && <ErrorBanner message={inviteError} onDismiss={() => setInviteError('')} />}
              {inviteSuccess && <div className="text-[12px] text-frame-resolve bg-frame-resolve/10 border border-frame-resolve/30 px-3 py-2 rounded-lg">{inviteSuccess}</div>}

              {invites.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-medium text-frame-text mb-2">초대 내역</h4>
                  <div className="space-y-1.5">
                    {invites.map(inv => (
                      <div key={inv.id} className={`flex items-center justify-between p-2.5 bg-frame-surface border border-frame-border rounded-lg text-[12px] ${!inv.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${inv.invite_type === 'member' ? 'bg-frame-accent/20 text-frame-accent' : 'bg-frame-resolve/20 text-frame-resolve'}`}>
                            {inv.invite_type === 'member' ? 'MEMBER' : 'GUEST'}
                          </span>
                          {inv.email ? (
                            <span className="text-frame-text">{inv.email}</span>
                          ) : (
                            <span className="text-frame-muted font-mono">{inv.invite_token?.slice(0, 8)}...</span>
                          )}
                          {inv.accepted_at && <span className="text-frame-resolve">수락됨</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {!inv.email && inv.is_active && !inv.accepted_at && (
                            <button onClick={() => {
                              const url = inv.invite_type === 'guest'
                                ? `${window.location.origin}${window.location.pathname}?share=${project.share_token}`
                                : `${window.location.origin}${window.location.pathname}?invite=${inv.invite_token}`;
                              navigator.clipboard?.writeText(url);
                            }} className="text-frame-muted hover:text-frame-text transition-colors" title="링크 복사">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                          )}
                          {isOwner && !inv.accepted_at && (
                            <button onClick={() => handleToggleInvite(inv.id, inv.is_active)} className={`text-[11px] ${inv.is_active ? 'text-frame-muted hover:text-frame-danger' : 'text-frame-accent hover:text-frame-accent/80'} transition-colors`}>
                              {inv.is_active ? '비활성화' : '활성화'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : tab === 'share' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-frame-surface border border-frame-border rounded-lg">
                <div>
                  <h4 className="text-[14px] text-frame-text font-medium">게스트 공유 링크</h4>
                  <p className="text-[12px] text-frame-muted mt-0.5">비로그인 사용자도 영상을 보고 코멘트를 남길 수 있습니다.</p>
                </div>
                {isOwner && (
                  <button onClick={handleToggleShare} className={`relative w-11 h-6 rounded-full transition-colors ${project.share_enabled !== false ? 'bg-frame-accent' : 'bg-frame-border'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${project.share_enabled !== false ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                )}
              </div>

              {project.share_enabled !== false && (
                <div>
                  <label className="text-[12px] text-frame-muted block mb-1">공유 URL</label>
                  <div className="flex gap-2">
                    <input readOnly value={`${window.location.origin}${window.location.pathname}?share=${project.share_token}`} className="flex-1 bg-frame-surface border border-frame-border rounded-md px-3 py-2 text-[12px] text-frame-text font-mono" />
                    <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?share=${project.share_token}`)} className="px-3 py-2 bg-frame-accent text-white text-[12px] rounded-md hover:bg-frame-accent/80 transition-colors">복사</button>
                  </div>
                  {isOwner && (
                    <button onClick={handleRegenShareToken} className="mt-2 text-[12px] text-frame-muted hover:text-frame-danger transition-colors">공유 링크 재생성</button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ========================================
// Guest Name Modal Component
// ========================================
function GuestNameModal({ onSubmit }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-frame-elevated border border-frame-border rounded-xl p-6 w-96 shadow-2xl">
        <div className="w-10 h-10 rounded-full bg-frame-accent/20 border border-frame-accent/30 flex items-center justify-center mx-auto mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-frame-accent">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <h3 className="font-display font-semibold text-[16px] text-frame-text text-center mb-1">GRIFF Frame</h3>
        <p className="text-[13px] text-frame-muted text-center mb-4">코멘트를 남기려면 이름을 입력해주세요.</p>
        <form onSubmit={handleSubmit}>
          <input ref={inputRef} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력하세요" className="w-full bg-frame-surface border border-frame-border rounded-md px-3 py-2.5 text-[14px] text-frame-text placeholder:text-frame-muted/50 focus:border-frame-accent transition-colors mb-3" />
          <button type="submit" disabled={!name.trim()} className="w-full py-2.5 bg-frame-accent text-white text-[14px] font-medium rounded-md hover:bg-frame-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            시작하기
          </button>
        </form>
      </div>
    </div>
  );
}

// ========================================
// Version Tab Bar
// ========================================
function VersionTabBar({ versions, activeVersionId, onSwitchVersion, onAddVersion, onCompare }) {
  if (!versions || versions.length === 0) return null;
  return (
    <div className="flex items-center gap-1 px-5 py-1.5 border-b border-frame-border bg-frame-surface/50 flex-shrink-0">
      {versions.map(v => (
        <button key={v.id} onClick={() => onSwitchVersion(v)} className={`px-3 py-1 rounded text-[12px] font-mono transition-all ${v.id === activeVersionId ? 'bg-frame-accent text-white' : 'text-frame-muted hover:text-frame-text hover:bg-frame-elevated'}`} title={v.description || ''}>
          v{v.version_number}
        </button>
      ))}
      {onAddVersion && <button onClick={onAddVersion} className="px-2 py-1 rounded text-[12px] text-frame-muted hover:text-frame-accent hover:bg-frame-accent/10 transition-all ml-1" title="새 버전 추가">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>}
      {versions.length >= 2 && (
        <button onClick={onCompare} className="flex items-center gap-1 px-2 py-1 rounded text-[12px] text-frame-muted hover:text-frame-accent hover:bg-frame-accent/10 transition-all ml-auto" title="버전 비교">
          <CompareIcon /> 비교
        </button>
      )}
    </div>
  );
}

// ========================================
// Add Version Modal
// ========================================
function AddVersionModal({ onClose, onAdd }) {
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vimeoId = extractVimeoId(vimeoUrl);
    if (!vimeoId) { setError('올바른 Vimeo URL을 입력하세요.'); return; }
    setLoading(true);
    setError('');
    const result = await onAdd(vimeoUrl.trim(), description.trim());
    setLoading(false);
    if (result) onClose();
    else setError('버전 추가에 실패했습니다.');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-frame-elevated border border-frame-border rounded-xl p-6 w-[440px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-semibold text-[16px] text-frame-text mb-4">새 버전 추가</h3>
        {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="text-[12px] text-frame-muted block mb-1">Vimeo 영상 URL</label>
            <input type="url" value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} required placeholder="https://vimeo.com/123456789" className="w-full bg-frame-surface border border-frame-border rounded-md px-3 py-2.5 text-[14px] text-frame-text font-mono placeholder:text-frame-muted/40 focus:border-frame-accent transition-colors" />
          </div>
          <div>
            <label className="text-[12px] text-frame-muted block mb-1">변경사항 설명</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="예: 컬러 보정 반영, 자막 수정 등" className="w-full bg-frame-surface border border-frame-border rounded-md px-3 py-2.5 text-[14px] text-frame-text placeholder:text-frame-muted/40 focus:border-frame-accent transition-colors" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-[13px] text-frame-muted border border-frame-border rounded-md hover:border-frame-muted transition-colors">취소</button>
            <button type="submit" disabled={loading || !vimeoUrl.trim()} className="flex-1 py-2.5 bg-frame-accent text-white text-[13px] font-medium rounded-md hover:bg-frame-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {loading ? <Spinner size="sm" /> : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================
// Compare View (Side by Side)
// ========================================
function CompareView({ versions, projectId, onClose }) {
  const [leftVersionId, setLeftVersionId] = useState(versions.length >= 2 ? versions[versions.length - 2].id : versions[0]?.id);
  const [rightVersionId, setRightVersionId] = useState(versions[versions.length - 1]?.id);
  const [syncPlaying, setSyncPlaying] = useState(false);
  const [syncTime, setSyncTime] = useState(0);
  const [syncDuration, setSyncDuration] = useState(0);
  const [leftComments, setLeftComments] = useState([]);
  const [rightComments, setRightComments] = useState([]);
  const leftContainerRef = useRef(null);
  const rightContainerRef = useRef(null);

  const leftVersion = versions.find(v => v.id === leftVersionId);
  const rightVersion = versions.find(v => v.id === rightVersionId);
  const leftVimeoUrl = leftVersion?.vimeo_url || null;
  const rightVimeoUrl = rightVersion?.vimeo_url || null;
  const leftVimeoId = leftVersion ? extractVimeoId(leftVersion.vimeo_url) : null;
  const rightVimeoId = rightVersion ? extractVimeoId(rightVersion.vimeo_url) : null;

  // 버전별 코멘트 로드
  useEffect(() => {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb || !projectId) return;
    if (leftVersionId) {
      sb.from('comments').select('*').eq('project_id', projectId).eq('version_id', leftVersionId)
        .order('timecode_seconds', { ascending: true })
        .then(function(res) { if (res.data) setLeftComments(res.data.map(dbToComment)); });
    }
    if (rightVersionId) {
      sb.from('comments').select('*').eq('project_id', projectId).eq('version_id', rightVersionId)
        .order('timecode_seconds', { ascending: true })
        .then(function(res) { if (res.data) setRightComments(res.data.map(dbToComment)); });
    }
  }, [projectId, leftVersionId, rightVersionId]);

  // 좌측 플레이어 생성 (autopause: false 필수 — 동시 재생 허용)
  useEffect(() => {
    if (!leftContainerRef.current || !leftVimeoId) return;
    const el = leftContainerRef.current;
    while (el.firstChild) el.removeChild(el.firstChild);
    const leftOpts = { width: '100%', responsive: true, byline: false, title: false, portrait: false, controls: false, keyboard: false, autopause: false };
    if (leftVimeoUrl) leftOpts.url = leftVimeoUrl; else leftOpts.id = leftVimeoId;
    const player = new Vimeo.Player(el, leftOpts);
    el.__vPlayer = player;
    player.ready().then(function() {
      player.getDuration().then(function(d) { setSyncDuration(d); });
    });
    player.on('timeupdate', function(data) { setSyncTime(data.seconds); });
    player.on('ended', function() { setSyncPlaying(false); });
    return () => { el.__vPlayer = null; player.destroy(); };
  }, [leftVimeoId]);

  // 우측 플레이어 생성 (autopause: false 필수 — 동시 재생 허용)
  useEffect(() => {
    if (!rightContainerRef.current || !rightVimeoId) return;
    const el = rightContainerRef.current;
    while (el.firstChild) el.removeChild(el.firstChild);
    const rightOpts = { width: '100%', responsive: true, byline: false, title: false, portrait: false, controls: false, keyboard: false, autopause: false };
    if (rightVimeoUrl) rightOpts.url = rightVimeoUrl; else rightOpts.id = rightVimeoId;
    const player = new Vimeo.Player(el, rightOpts);
    el.__vPlayer = player;
    return () => { el.__vPlayer = null; player.destroy(); };
  }, [rightVimeoId]);

  // 재생 중 주기적 시간 동기화 (drift 보정)
  const syncIntervalRef = useRef(null);
  useEffect(() => {
    if (syncPlaying) {
      syncIntervalRef.current = setInterval(function() {
        const left = leftContainerRef.current?.__vPlayer;
        const right = rightContainerRef.current?.__vPlayer;
        if (!left || !right) return;
        Promise.all([left.getCurrentTime(), right.getCurrentTime()]).then(function(times) {
          var drift = Math.abs(times[0] - times[1]);
          // 0.3초 이상 차이나면 right를 left 기준으로 보정
          if (drift > 0.3) {
            right.setCurrentTime(times[0]).catch(function() {});
          }
        });
      }, 2000);
    }
    return function() {
      if (syncIntervalRef.current) { clearInterval(syncIntervalRef.current); syncIntervalRef.current = null; }
    };
  }, [syncPlaying]);

  const handleSyncPlayPause = useCallback(() => {
    const left = leftContainerRef.current?.__vPlayer;
    const right = rightContainerRef.current?.__vPlayer;
    if (!left || !right) return;

    if (!syncPlaying) {
      // Promise.all로 양쪽 모두 play 성공을 확인
      // Autoplay Policy: 사용자 클릭 핸들러에서 동기적으로 play() 호출해야 함
      var leftPlay = left.play();
      var rightPlay = right.play();
      Promise.all([leftPlay, rightPlay]).then(function() {
        // 양쪽 모두 재생 성공 → 시간 동기화
        return left.getCurrentTime();
      }).then(function(time) {
        return right.setCurrentTime(time);
      }).catch(function(e) {
        // Autoplay 정책 실패 시: 음소거 후 재시도
        console.warn('[GRIFF] play blocked, retrying muted:', e.name);
        return Promise.all([left.setVolume(0), right.setVolume(0)]).then(function() {
          return Promise.all([left.play(), right.play()]);
        }).then(function() {
          return left.getCurrentTime();
        }).then(function(time) {
          return right.setCurrentTime(time);
        });
      }).catch(function(e) {
        console.error('[GRIFF] sync play failed:', e);
        setSyncPlaying(false);
      });
      setSyncPlaying(true);
    } else {
      Promise.all([left.pause(), right.pause()]).catch(function() {});
      setSyncPlaying(false);
    }
  }, [syncPlaying]);

  const handleSyncSeek = useCallback(function(time) {
    const left = leftContainerRef.current?.__vPlayer;
    const right = rightContainerRef.current?.__vPlayer;
    if (!left || !right) return;
    setSyncTime(time);
    // 양쪽 동시에 seek 후 완료 대기
    Promise.all([
      left.setCurrentTime(time),
      right.setCurrentTime(time),
    ]).catch(function() {});
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-5 py-2 border-b border-frame-border bg-frame-surface/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CompareIcon />
          <span className="font-display font-semibold text-[14px] text-frame-text">버전 비교</span>
        </div>
        <button onClick={onClose} className="text-[13px] text-frame-muted hover:text-frame-text border border-frame-border rounded-md px-3 py-1 hover:border-frame-muted transition-colors">비교 종료</button>
      </div>

      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <select value={leftVersionId} onChange={e => setLeftVersionId(e.target.value)} className="bg-frame-elevated border border-frame-border rounded-md px-2 py-1 text-[12px] text-frame-text font-mono">
              {versions.map(v => <option key={v.id} value={v.id}>v{v.version_number}{v.description ? ` — ${v.description}` : ''}</option>)}
            </select>
            <span className="text-[11px] text-frame-muted">{leftComments.length}개 코멘트</span>
          </div>
          <div ref={leftContainerRef} className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }} />
          <div className="mt-2 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            {leftComments.length === 0 ? (
              <p className="text-[11px] text-frame-muted/50 text-center py-2">코멘트 없음</p>
            ) : leftComments.map(c => (
              <div key={c.id} className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${Math.abs(c.timecode - syncTime) < 2 ? 'bg-frame-accent/10' : ''}`}>
                <span className="font-mono text-[10px] text-frame-accent whitespace-nowrap">{formatTimecode(c.timecode)}</span>
                <span className="text-[10px] text-frame-text/80 truncate">{c.body}</span>
                <span className="text-[10px] text-frame-muted whitespace-nowrap">{c.author}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <select value={rightVersionId} onChange={e => setRightVersionId(e.target.value)} className="bg-frame-elevated border border-frame-border rounded-md px-2 py-1 text-[12px] text-frame-text font-mono">
              {versions.map(v => <option key={v.id} value={v.id}>v{v.version_number}{v.description ? ` — ${v.description}` : ''}</option>)}
            </select>
            <span className="text-[11px] text-frame-muted">{rightComments.length}개 코멘트</span>
          </div>
          <div ref={rightContainerRef} className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }} />
          <div className="mt-2 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
            {rightComments.length === 0 ? (
              <p className="text-[11px] text-frame-muted/50 text-center py-2">코멘트 없음</p>
            ) : rightComments.map(c => (
              <div key={c.id} className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${Math.abs(c.timecode - syncTime) < 2 ? 'bg-frame-accent/10' : ''}`}>
                <span className="font-mono text-[10px] text-frame-accent whitespace-nowrap">{formatTimecode(c.timecode)}</span>
                <span className="text-[10px] text-frame-text/80 truncate">{c.body}</span>
                <span className="text-[10px] text-frame-muted whitespace-nowrap">{c.author}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-[11px] text-frame-muted">{formatTimecode(syncTime)}</span>
          <button onClick={handleSyncPlayPause} className="w-9 h-9 rounded-full bg-frame-accent flex items-center justify-center hover:bg-frame-accent/80 transition-colors">
            {syncPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span className="font-mono text-[11px] text-frame-muted">{formatTimecode(syncDuration)}</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Review Page (기존 App)
// ========================================
function ReviewPage({ project: initialProject, onBack, isGuest, guestName: initialGuestName, initialVersionNumber, user }) {
  const [project, setProject] = useState(initialProject);
  const [comments, setComments] = useState([]);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isEnded, setIsEnded] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [guestName, setGuestName] = useState(initialGuestName || '');
  const [showGuestModal, setShowGuestModal] = useState(isGuest && !initialGuestName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // 볼륨 & 풀스크린
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const reviewContainerRef = useRef(null);
  const mainPlayerRef = useRef(null);
  // 버전 관리
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  // 타임코드/프레임 토글
  const [showFrames, setShowFrames] = useState(false);
  const FPS = 24; // 기본 프레임레이트
  const tc = useCallback(function(seconds) { return formatTC(seconds, showFrames, FPS); }, [showFrames]);
  // 구간 코멘트
  const [pendingRange, setPendingRange] = useState(null);
  // 권한
  const [myRole, setMyRole] = useState(isGuest ? 'guest' : null);

  // 내 역할 조회
  useEffect(() => {
    if (isGuest) return;
    window.__griffAuth?.getMyRole(project.id).then(role => {
      setMyRole(role || 'member');
    });
  }, [project.id, isGuest]);

  const activeVimeoUrl = activeVersion ? activeVersion.vimeo_url : project.vimeo_url;
  const vimeoId = extractVimeoId(activeVimeoUrl);

  // 버전 목록 로드
  useEffect(() => {
    window.__griffAuth?.fetchProjectVersions(project.id).then(async (data) => {
      if (data && data.length > 0) {
        setVersions(data);
        if (initialVersionNumber) {
          const target = data.find(v => v.version_number === Number(initialVersionNumber));
          if (target) { setActiveVersion(target); return; }
        }
        const active = data.find(v => v.is_active) || data[data.length - 1];
        setActiveVersion(active);
      } else if (!isGuest) {
        // 버전이 없는 기존 프로젝트 → v1 자동 생성
        const v1 = await window.__griffAuth?.createProjectVersion(project.id, project.vimeo_url, '초기 버전');
        if (v1) { setVersions([v1]); setActiveVersion(v1); }
      }
    });
  }, [project.id, initialVersionNumber]);

  // 코멘트 로드 (버전별)
  useEffect(() => {
    const sb = window.__griffSupabase?.getSupabase();
    if (!sb) { setLoading(false); return; }

    let query = sb.from('comments').select('*').eq('project_id', project.id).order('timecode_seconds', { ascending: true });
    if (activeVersion) {
      query = query.eq('version_id', activeVersion.id);
    }

    query.then(({ data, error: err }) => {
      if (err) { console.error('[GRIFF] fetchComments:', err); }
      else if (data) { setComments(data.map(dbToComment)); }
      setLoading(false);
    });

    // Realtime
    const channel = sb.channel(`comments-${project.id}-${activeVersion?.id || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `project_id=eq.${project.id}` }, (payload) => {
        // 현재 버전의 코멘트만 반영
        if (activeVersion && payload.new?.version_id && payload.new.version_id !== activeVersion.id) return;
        if (payload.eventType === 'INSERT') {
          setComments(prev => {
            if (prev.find(c => c.id === payload.new.id)) return prev;
            return [...prev, dbToComment(payload.new)];
          });
        } else if (payload.eventType === 'UPDATE') {
          setComments(prev => prev.map(c => c.id === payload.new.id ? dbToComment(payload.new) : c));
        } else if (payload.eventType === 'DELETE') {
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { channel?.unsubscribe(); };
  }, [project.id, activeVersion?.id]);

  const handleTimeUpdate = useCallback((s) => setCurrentTime(s), []);
  const handleDurationReady = useCallback((d) => setDuration(d), []);

  useEffect(() => {
    if (showExport) {
      const handler = () => setShowExport(false);
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [showExport]);

  const handlePlayPause = useCallback(() => { setIsEnded(false); setIsPlaying(prev => !prev); }, []);
  const handleEnded = useCallback(() => { setIsPlaying(false); setIsEnded(true); }, []);

  const seekTo = useCallback((time) => {
    setCurrentTime(time);
    const player = mainPlayerRef.current || window.__griffPlayer;
    if (player) player.setCurrentTime(time).catch(() => {});
  }, []);

  const handleSeek = useCallback((time) => {
    seekTo(time);
  }, [seekTo]);

  // 풀스크린 토글
  const handleFullscreenToggle = useCallback(() => {
    if (!reviewContainerRef.current) return;
    if (!document.fullscreenElement) {
      reviewContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // 키보드 단축키 (e.code 기반 — 한글 IME에서도 동작)
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsEnded(false);
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentTime(prev => { const t = Math.max(0, prev - 5); seekTo(t); return t; });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentTime(prev => { const t = Math.min(duration, prev + 5); seekTo(t); return t; });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          setIsMuted(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'KeyM':
          setIsMuted(prev => !prev);
          break;
        case 'KeyF':
          handleFullscreenToggle();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [duration, handleFullscreenToggle]);

  // 버전 전환
  const handleSwitchVersion = useCallback(async (version) => {
    if (version.id === activeVersion?.id) return;
    setActiveVersion(version);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsEnded(false);
    setLoading(true);
    await window.__griffAuth?.switchActiveVersion(project.id, version.id);
  }, [activeVersion, project.id]);

  // 새 버전 추가
  const handleAddVersion = useCallback(async (vimeoUrl, description) => {
    const result = await window.__griffAuth?.createProjectVersion(project.id, vimeoUrl, description);
    if (result) {
      setVersions(prev => [...prev, result]);
      setActiveVersion(result);
      setCurrentTime(0);
      setIsPlaying(false);
      setIsEnded(false);
      return result;
    }
    return null;
  }, [project.id]);

  const handleMarkerClick = useCallback((commentId) => {
    setActiveCommentId(commentId);
    const c = comments.find(x => x.id === commentId);
    if (c) seekTo(c.timecode);
  }, [comments, seekTo]);

  const handleCommentClick = useCallback((commentId) => {
    setActiveCommentId(commentId);
    const c = comments.find(x => x.id === commentId);
    if (c) seekTo(c.timecode);
  }, [comments]);

  const handleResolve = useCallback((commentId) => {
    const c = comments.find(x => x.id === commentId);
    if (!c) return;
    const newResolved = !c.resolved;
    setComments(prev => prev.map(x => x.id === commentId ? { ...x, resolved: newResolved } : x));
    const sb = window.__griffSupabase?.getSupabase();
    if (sb) {
      sb.from('comments').update({ is_resolved: newResolved }).eq('id', commentId).then(({ error: err }) => {
        if (err) setComments(prev => prev.map(x => x.id === commentId ? { ...x, resolved: !newResolved } : x));
      });
    }
  }, [comments]);

  const handleAddComment = useCallback((newComment) => {
    const color = getAuthorColor(newComment.author);
    const sb = window.__griffSupabase?.getSupabase();
    if (sb) {
      const row = {
        project_id: project.id,
        timecode_seconds: newComment.timecode,
        body: newComment.body,
        author_name: newComment.author,
        author_color: color,
      };
      if (newComment.timecodeEnd != null) row.timecode_end_seconds = newComment.timecodeEnd;
      if (activeVersion) row.version_id = activeVersion.id;
      sb.from('comments').insert(row).select().single().then(({ data, error: err }) => {
        if (data) {
          setComments(prev => {
            if (prev.find(c => c.id === data.id)) return prev;
            return [...prev, dbToComment(data)];
          });
        }
      });
    }
    // 구간 코멘트 입력 후 자동 해제
    setPendingRange(null);
  }, [project.id, activeVersion]);

  if (!vimeoId) {
    return (
      <div className="h-screen flex items-center justify-center bg-frame-bg">
        <div className="text-center">
          <ErrorBanner message="올바르지 않은 Vimeo URL입니다." />
          <button onClick={onBack} className="mt-4 text-frame-accent text-[13px] hover:underline">프로젝트 목록으로</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={reviewContainerRef} className="h-screen flex flex-col bg-frame-bg">
      <ReviewHeader project={project} onExportClick={(e) => { e.stopPropagation(); setShowExport(prev => !prev); }} showExport={showExport} onShareClick={() => setShowShare(true)} onBack={onBack} comments={comments} duration={duration} myRole={myRole} isGuest={isGuest} onSettingsClick={!isGuest ? () => setShowSettings(true) : null} />

      {versions.length > 0 && !compareMode && (
        <VersionTabBar versions={versions} activeVersionId={activeVersion?.id} onSwitchVersion={handleSwitchVersion} onAddVersion={!isGuest ? () => setShowAddVersion(true) : null} onCompare={() => setCompareMode(true)} />
      )}

      {error && <div className="px-5 pt-2"><ErrorBanner message={error} onDismiss={() => setError('')} /></div>}

      {compareMode ? (
        <CompareView versions={versions} projectId={project.id} onClose={() => setCompareMode(false)} />
      ) : (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col p-4 pr-0 min-w-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0">
              <VideoPlayer vimeoId={vimeoId} vimeoUrl={activeVimeoUrl} currentTime={currentTime} duration={duration} isPlaying={isPlaying} isEnded={isEnded} onPlayPause={handlePlayPause} onEnded={handleEnded} playbackRate={playbackRate} onRateChange={setPlaybackRate} onTimeUpdate={handleTimeUpdate} onDurationReady={handleDurationReady} onError={setError} volume={volume} onVolumeChange={setVolume} isMuted={isMuted} onMuteToggle={() => setIsMuted(prev => !prev)} playerRefOut={mainPlayerRef} tc={tc} />
              <Timeline comments={comments} currentTime={currentTime} duration={duration} activeCommentId={activeCommentId} isPlaying={isPlaying} onMarkerClick={handleMarkerClick} onSeek={handleSeek} onPlayPause={handlePlayPause} isFullscreen={isFullscreen} onFullscreenToggle={handleFullscreenToggle} tc={tc} onTcToggle={() => setShowFrames(prev => !prev)} onRangeSelect={(start, end) => setPendingRange({ start, end })} pendingRange={pendingRange} onSkip={(delta) => { const t = Math.max(0, Math.min(duration, currentTime + delta)); seekTo(t); }} />
            </div>
            <div className="flex items-center gap-4 mt-auto pt-3 border-t border-frame-border/50 text-[11px] text-frame-muted/50 font-mono">
              <span>Duration {tc(duration)}</span>
              <span>Comments {comments.length}</span>
              <span>Playback {playbackRate}x</span>
              {activeVersion && <span>v{activeVersion.version_number}{activeVersion.description ? ` — ${activeVersion.description}` : ''}</span>}
            </div>
          </div>

          <div className="w-[340px] border-l border-frame-border flex-shrink-0 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center"><Spinner text="코멘트 로딩..." /></div>
            ) : (
              <CommentPanel comments={comments} activeCommentId={activeCommentId} onCommentClick={handleCommentClick} onResolve={isGuest ? null : handleResolve} onAddComment={handleAddComment} currentTime={currentTime} guestName={guestName} tc={tc} pendingRange={pendingRange} onClearRange={() => setPendingRange(null)} />
            )}
          </div>
        </div>
      )}

      {showShare && <ShareModal onClose={() => setShowShare(false)} shareToken={project.share_token} versions={versions} />}
      {showGuestModal && <GuestNameModal onSubmit={(name) => { setGuestName(name); localStorage.setItem('griff_guest_name', name); setShowGuestModal(false); }} />}
      {showAddVersion && <AddVersionModal onClose={() => setShowAddVersion(false)} onAdd={handleAddVersion} />}
      {showSettings && <ProjectSettingsModal onClose={() => setShowSettings(false)} project={project} myRole={myRole} onProjectUpdate={(updated) => setProject(updated)} />}
    </div>
  );
}

// ========================================
// Root App — Router
// ========================================
function App() {
  const [page, setPage] = useState('loading'); // loading | login | projects | review
  const [user, setUser] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [guestProject, setGuestProject] = useState(null);
  const [guestName, setGuestName] = useState(() => localStorage.getItem('griff_guest_name') || '');

  // 게스트 버전 번호 (URL ?v= 파라미터)
  const [guestVersionNumber, setGuestVersionNumber] = useState(null);
  // 초대 토큰 (URL ?invite= 파라미터)
  const [pendingInviteToken, setPendingInviteToken] = useState(null);

  // 초기 라우팅: share/invite 파라미터 확인 → 세션 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get('share');
    const inviteToken = params.get('invite');
    const vParam = params.get('v');

    if (shareToken) {
      if (vParam) setGuestVersionNumber(vParam);
      // 게스트 모드
      window.__griffAuth?.fetchProjectByShareToken(shareToken).then(project => {
        if (project) {
          setGuestProject(project);
          setPage('review');
        } else {
          setPage('login');
        }
      });
      return;
    }

    if (inviteToken) {
      setPendingInviteToken(inviteToken);
    }

    // 멤버 세션 확인
    window.__griffAuth?.getUser().then(async (u) => {
      if (u) {
        setUser(u);
        // 초대 토큰이 있으면 수락
        if (inviteToken) {
          const result = await window.__griffAuth?.acceptInviteByToken(inviteToken);
          if (result?.project) {
            setCurrentProject(result.project);
            // URL 정리
            window.history.replaceState({}, '', window.location.pathname);
            setPage('review');
            return;
          }
        }
        setPage('projects');
      } else {
        setPage('login');
      }
    });

    // Auth 상태 변경 리스너
    const sub = window.__griffAuth?.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentProject(null);
        setPage('login');
      }
    });

    return () => { sub?.unsubscribe(); };
  }, []);

  const handleLogin = async (session) => {
    const u = session?.user;
    setUser(u);
    // 로그인 후 pending invite 처리
    if (pendingInviteToken && u) {
      const result = await window.__griffAuth?.acceptInviteByToken(pendingInviteToken);
      setPendingInviteToken(null);
      window.history.replaceState({}, '', window.location.pathname);
      if (result?.project) {
        setCurrentProject(result.project);
        setPage('review');
        return;
      }
    }
    setPage('projects');
  };

  const handleLogout = async () => {
    await window.__griffAuth?.signOut();
    setUser(null);
    setCurrentProject(null);
    setPage('login');
  };

  const handleSelectProject = (project) => {
    setCurrentProject(project);
    setPage('review');
  };

  const handleBackToProjects = () => {
    setCurrentProject(null);
    window.__griffPlayer?.destroy?.().catch(() => {});
    window.__griffPlayer = null;
    setPage('projects');
  };

  if (page === 'loading') {
    return <div className="h-screen flex items-center justify-center bg-frame-bg"><Spinner text="로딩 중..." /></div>;
  }

  if (page === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (page === 'projects') {
    return <ProjectListPage user={user} onSelectProject={handleSelectProject} onLogout={handleLogout} />;
  }

  if (page === 'review') {
    const project = guestProject || currentProject;
    if (!project) { setPage('projects'); return null; }
    return <ReviewPage project={project} onBack={guestProject ? null : handleBackToProjects} isGuest={!!guestProject} guestName={guestName} initialVersionNumber={guestProject ? guestVersionNumber : null} user={user} />;
  }

  return null;
}

// ========================================
// Render
// ========================================
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
