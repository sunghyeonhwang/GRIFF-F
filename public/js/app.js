// ========================================
// React Hooks
// ========================================
const { useState, useRef, useEffect, useCallback, useMemo } = React;

// ========================================
// Data
// ========================================
const PROJECT = {
  title: 'GRIFF 브랜드 필름 v3',
  vimeoId: '1161338069',
  vimeoUrl: 'https://vimeo.com/1161338069',
  duration: 0,
  createdAt: '2026-02-28',
};

const INITIAL_COMMENTS = [
  { id: 1, timecode: 12, body: '오프닝 로고 애니메이션 속도 조절 필요', author: '김성현', color: '#3d8bfd', createdAt: '2026-03-01 14:23', resolved: false },
  { id: 2, timecode: 34, body: '이 씬 컬러그레이딩 좀 더 따뜻하게', author: '박지영', color: '#f59e0b', createdAt: '2026-03-01 15:10', resolved: false },
  { id: 3, timecode: 75, body: 'BGM 볼륨 살짝 낮춰주세요', author: '이클라이언트', color: '#22d3ee', createdAt: '2026-03-02 09:45', resolved: true },
  { id: 4, timecode: 123, body: '자막 폰트 변경 요청 — Pretendard로', author: '김성현', color: '#3d8bfd', createdAt: '2026-03-02 11:30', resolved: false },
  { id: 5, timecode: 225, body: '엔딩 크레딧 순서 확인 부탁', author: '박지영', color: '#f59e0b', createdAt: '2026-03-03 10:15', resolved: false },
];

// ========================================
// Utility Functions
// ========================================
function formatTimecode(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getAuthorInitial(name) {
  return name.charAt(0);
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

// ========================================
// Header Component
// ========================================
function Header({ onExportClick, showExport, onShareClick }) {
  return (
    <header className="h-14 border-b border-frame-border flex items-center justify-between px-5 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-frame-accent flex items-center justify-center">
            <span className="font-display font-bold text-[11px] text-white tracking-wider">GF</span>
          </div>
          <span className="font-display font-semibold text-sm text-frame-muted tracking-wide">GRIFF FRAME</span>
        </div>
        <div className="w-px h-5 bg-frame-border"/>
        <h1 className="font-display font-medium text-[15px] text-frame-text">{PROJECT.title}</h1>
        <span className="text-[11px] font-mono text-frame-muted bg-frame-elevated px-2 py-0.5 rounded">{PROJECT.createdAt}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onShareClick} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-frame-muted hover:text-frame-text border border-frame-border rounded-md hover:border-frame-muted transition-colors">
          <ShareIcon /> 공유 링크
        </button>
        <div className="relative">
          <button onClick={onExportClick} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-frame-accent/10 text-frame-accent border border-frame-accent/30 rounded-md hover:bg-frame-accent/20 transition-colors">
            <ExportIcon /> 내보내기
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M7 10l5 5 5-5z"/></svg>
          </button>
          {showExport && <ExportDropdown />}
        </div>
      </div>
    </header>
  );
}

// ========================================
// Export Dropdown
// ========================================
function ExportDropdown() {
  const formats = [
    { label: 'Premiere Pro XML', desc: '.xml 마커', icon: 'Pr' },
    { label: 'Final Cut Pro', desc: '.fcpxml', icon: 'Fc' },
    { label: 'DaVinci Resolve', desc: '.edl 마커', icon: 'Dv' },
    { label: 'CSV', desc: '.csv 스프레드시트', icon: 'Cs' },
  ];

  return (
    <div className="export-menu absolute top-full right-0 mt-1 w-56 bg-frame-elevated border border-frame-border rounded-lg shadow-2xl shadow-black/50 overflow-hidden z-50">
      <div className="px-3 py-2 border-b border-frame-border">
        <span className="text-[11px] font-mono text-frame-muted uppercase tracking-wider">Export Format</span>
      </div>
      {formats.map((f, i) => (
        <button key={i} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-frame-accent/10 transition-colors text-left group">
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
function VideoPlayer({ currentTime, isPlaying, onPlayPause, playbackRate, onRateChange, onTimeUpdate, onDurationReady, duration, isEnded, onEnded }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || playerRef.current) return;

    const player = new Vimeo.Player(containerRef.current, {
      id: PROJECT.vimeoId,
      width: '100%',
      responsive: true,
      byline: false,
      title: false,
      portrait: false,
      controls: false,
      keyboard: false,
    });

    playerRef.current = player;

    player.ready().then(() => {
      setPlayerReady(true);
      player.getDuration().then(dur => {
        if (onDurationReady) onDurationReady(dur);
      });
    });

    player.on('timeupdate', (data) => {
      if (onTimeUpdate) onTimeUpdate(data.seconds);
    });

    player.on('ended', () => {
      if (onEnded) onEnded();
    });

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, []);

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
    window.__griffPlayer = playerRef.current;
  }, [playerReady]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden flex-1 min-h-0">
      <div ref={containerRef} className="w-full h-full" />

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

      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
        <span className="font-mono text-[13px] text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">{formatTimecode(currentTime)}</span>
        <span className="text-white/30 text-xs">/</span>
        <span className="font-mono text-[13px] text-white/40">{formatTimecode(duration)}</span>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        {[0.5, 1, 1.5, 2].map(rate => (
          <button key={rate} onClick={() => onRateChange(rate)} className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${playbackRate === rate ? 'bg-frame-accent text-white' : 'bg-black/40 text-white/50 hover:text-white/80 backdrop-blur-sm'}`}>
            {rate}x
          </button>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Timeline Component
// ========================================
function Timeline({ comments, currentTime, duration, activeCommentId, onMarkerClick, onSeek, onPlayPause, isPlaying }) {
  const timelineRef = useRef(null);
  const progress = (currentTime / duration) * 100;

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const newTime = Math.max(0, Math.min(duration, pct * duration));
    onSeek(newTime);
  };

  return (
    <div className="mt-3 px-1 flex-shrink-0">
      <div className="flex justify-between mb-1">
        <span className="font-mono text-[10px] text-frame-muted">{formatTimecode(currentTime)}</span>
        <span className="font-mono text-[10px] text-frame-muted">{formatTimecode(duration)}</span>
      </div>

      <div ref={timelineRef} className="relative h-8 bg-frame-surface rounded cursor-pointer group" onClick={handleTimelineClick}>
        <div className="absolute top-0 left-0 h-full bg-frame-accent/10 rounded-l transition-all" style={{ width: `${progress}%` }} />

        <div className="absolute inset-0 flex items-center px-1 opacity-30">
          {Array.from({ length: 80 }, (_, i) => {
            const h = Math.sin(i * 0.3) * 30 + Math.cos(i * 0.7) * 20 + 50;
            return <div key={i} className="flex-1 mx-px rounded-sm bg-frame-muted/30" style={{ height: `${h}%`, alignSelf: 'center' }} />;
          })}
        </div>

        <div className="playhead absolute top-0 h-full w-0.5 bg-frame-accent z-20 glow-line" style={{ left: `${progress}%` }}>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-frame-accent border-2 border-frame-bg" />
        </div>

        {comments.map(comment => {
          const pos = (comment.timecode / duration) * 100;
          const isActive = comment.id === activeCommentId;
          return (
            <div key={comment.id} className="marker-group absolute top-0 h-full z-10" style={{ left: `${pos}%` }} onClick={(e) => { e.stopPropagation(); onMarkerClick(comment.id); }}>
              <div className={`absolute top-1 bottom-1 w-0.5 rounded transition-all ${isActive ? 'bg-frame-accent w-1 glow-line' : 'bg-frame-muted/60 hover:bg-frame-accent'}`} style={{ left: '-1px' }} />
              <div className={`absolute bottom-0 w-2 h-2 rounded-full transition-all -translate-x-1/2 ${isActive ? 'bg-frame-accent scale-150' : 'hover:scale-125'}`} style={{ backgroundColor: isActive ? undefined : comment.color }} />
              <div className="marker-tooltip absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-frame-elevated border border-frame-border rounded-md px-2.5 py-1.5 shadow-xl shadow-black/50 whitespace-nowrap z-30">
                <div className="text-[11px] font-mono text-frame-accent">{formatTimecode(comment.timecode)}</div>
                <div className="text-[11px] text-frame-text mt-0.5 max-w-[200px] truncate">{comment.body}</div>
                <div className="text-[10px] text-frame-muted mt-0.5">{comment.author}</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-frame-border" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-3">
        <button className="text-frame-muted hover:text-frame-text transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button onClick={onPlayPause} className="w-9 h-9 rounded-full bg-frame-accent flex items-center justify-center hover:bg-frame-accent/80 transition-colors">
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="text-frame-muted hover:text-frame-text transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
      </div>
    </div>
  );
}

// ========================================
// Comment Item Component
// ========================================
function CommentItem({ comment, isActive, onClick, onResolve }) {
  const ref = useRef(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      ref.current.classList.add('comment-highlight');
      const timer = setTimeout(() => ref.current?.classList.remove('comment-highlight'), 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <div ref={ref} onClick={onClick} className={`px-4 py-3 cursor-pointer transition-all border-l-2 ${isActive ? 'border-l-frame-accent bg-frame-accent/5' : 'border-l-transparent hover:bg-frame-elevated/50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white" style={{ backgroundColor: comment.color }}>
            {getAuthorInitial(comment.author)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-frame-text">{comment.author}</span>
              <span className="font-mono text-[11px] text-frame-accent bg-frame-accent/10 px-1.5 py-0 rounded">{formatTimecode(comment.timecode)}</span>
            </div>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }} className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${comment.resolved ? 'bg-frame-resolve/20 border-frame-resolve text-frame-resolve' : 'border-frame-border text-transparent hover:border-frame-muted hover:text-frame-muted'}`} title={comment.resolved ? '해결됨' : '해결로 표시'}>
          <CheckIcon />
        </button>
      </div>
      <p className={`text-[13px] mt-1.5 ml-8 leading-relaxed ${comment.resolved ? 'text-frame-muted line-through' : 'text-frame-text/80'}`}>{comment.body}</p>
      <span className="text-[10px] text-frame-muted/60 ml-8 mt-1 block">{comment.createdAt}</span>
    </div>
  );
}

// ========================================
// Comment Panel Component
// ========================================
function CommentPanel({ comments, activeCommentId, onCommentClick, onResolve, onAddComment, currentTime }) {
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState('나');
  const inputRef = useRef(null);
  const resolvedCount = comments.filter(c => c.resolved).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAddComment({ body: inputText.trim(), author: authorName || '익명', timecode: currentTime });
    setInputText('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-frame-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-[14px] text-frame-text">코멘트</h2>
          <span className="text-[11px] text-frame-muted bg-frame-elevated px-1.5 py-0.5 rounded-full font-mono">{comments.length}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-frame-muted">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-frame-resolve inline-block" />{resolvedCount} 해결</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-frame-amber inline-block" />{comments.length - resolvedCount} 미해결</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-frame-border/50">
        {comments.sort((a, b) => a.timecode - b.timecode).map(comment => (
          <CommentItem key={comment.id} comment={comment} isActive={comment.id === activeCommentId} onClick={() => onCommentClick(comment.id)} onResolve={onResolve} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-frame-border p-3 flex-shrink-0 bg-frame-surface/50">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[11px] text-frame-accent bg-frame-accent/10 px-1.5 py-0.5 rounded">{formatTimecode(currentTime)}</span>
          <span className="text-[11px] text-frame-muted">에 코멘트 추가</span>
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
function ShareModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = 'https://griff-frame.app/share/a1b2c3d4';

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
// App Component
// ========================================
function App() {
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(PROJECT.duration || 285);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isEnded, setIsEnded] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const handleTimeUpdate = useCallback((seconds) => { setCurrentTime(seconds); }, []);
  const handleDurationReady = useCallback((dur) => { setDuration(dur); }, []);

  useEffect(() => {
    const handler = () => setShowExport(false);
    if (showExport) {
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [showExport]);

  const handlePlayPause = useCallback(() => {
    setIsEnded(false);
    setIsPlaying(prev => !prev);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setIsEnded(true);
  }, []);

  const handleSeek = useCallback((time) => {
    setCurrentTime(time);
    if (window.__griffPlayer) window.__griffPlayer.setCurrentTime(time);
  }, []);

  const handleMarkerClick = useCallback((commentId) => {
    setActiveCommentId(commentId);
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setCurrentTime(comment.timecode);
      if (window.__griffPlayer) window.__griffPlayer.setCurrentTime(comment.timecode);
    }
  }, [comments]);

  const handleCommentClick = useCallback((commentId) => {
    setActiveCommentId(commentId);
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setCurrentTime(comment.timecode);
      if (window.__griffPlayer) window.__griffPlayer.setCurrentTime(comment.timecode);
    }
  }, [comments]);

  const handleResolve = useCallback((commentId) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved: !c.resolved } : c));
  }, []);

  const handleAddComment = useCallback((newComment) => {
    const authorColors = ['#3d8bfd', '#f59e0b', '#22d3ee', '#a78bfa', '#f472b6'];
    setComments(prev => [...prev, {
      ...newComment,
      id: Date.now(),
      color: authorColors[Math.floor(Math.random() * authorColors.length)],
      createdAt: new Date().toLocaleString('ko-KR'),
      resolved: false,
    }]);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header onExportClick={(e) => { e.stopPropagation(); setShowExport(prev => !prev); }} showExport={showExport} onShareClick={() => setShowShare(true)} />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col p-4 pr-0 min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <VideoPlayer currentTime={currentTime} duration={duration} isPlaying={isPlaying} isEnded={isEnded} onPlayPause={handlePlayPause} onEnded={handleEnded} playbackRate={playbackRate} onRateChange={setPlaybackRate} onTimeUpdate={handleTimeUpdate} onDurationReady={handleDurationReady} />
            <Timeline comments={comments} currentTime={currentTime} duration={duration} activeCommentId={activeCommentId} isPlaying={isPlaying} onMarkerClick={handleMarkerClick} onSeek={handleSeek} onPlayPause={handlePlayPause} />
          </div>
          <div className="flex items-center gap-4 mt-auto pt-3 border-t border-frame-border/50 text-[11px] text-frame-muted/50 font-mono">
            <span>Duration {formatTimecode(duration)}</span>
            <span>Comments {comments.length}</span>
            <span>Playback {playbackRate}x</span>
            <span className="ml-auto">GRIFF Frame v0.1</span>
          </div>
        </div>

        <div className="w-[340px] border-l border-frame-border flex-shrink-0 flex flex-col">
          <CommentPanel comments={comments} activeCommentId={activeCommentId} onCommentClick={handleCommentClick} onResolve={handleResolve} onAddComment={handleAddComment} currentTime={currentTime} />
        </div>
      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}

// ========================================
// Render
// ========================================
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
