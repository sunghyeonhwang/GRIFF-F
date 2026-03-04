// ============================================
// GRIFF Frame — Supabase Client
// ============================================

const SUPABASE_URL = 'https://zhqjkrqhniqqwsgnykda.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpocWprcnFobmlxcXdzZ255a2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Njg0NTcsImV4cCI6MjA4ODE0NDQ1N30.-KgX70iav5qSeoyHkv_BX52k_n2cfU28BHZxeVN-m04';

// 현재 프로젝트 ID (DB에서 가져온 값)
const PROJECT_ID = '7a0fcef1-1951-4ad7-9695-b8567aeb1ba9';

let sb = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.warn('[GRIFF] Supabase SDK 미로드 — 로컬 모드로 동작합니다.');
    return null;
  }
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('[GRIFF] Supabase 연결 완료');
  return sb;
}

function getSupabase() {
  return sb;
}

function getProjectId() {
  return PROJECT_ID;
}

// ============================================
// Comments API
// ============================================

async function fetchComments() {
  if (!sb) return null;
  const { data, error } = await sb
    .from('comments')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('timecode_seconds', { ascending: true });
  if (error) { console.error('[GRIFF] fetchComments error:', error); return null; }
  return data;
}

async function insertComment({ timecode_seconds, timecode_end_seconds, body, author_name, author_color, version_id }) {
  if (!sb) return null;
  const row = {
    project_id: PROJECT_ID,
    timecode_seconds,
    body,
    author_name,
    author_color,
  };
  if (timecode_end_seconds != null) row.timecode_end_seconds = timecode_end_seconds;
  if (version_id) row.version_id = version_id;
  const { data, error } = await sb
    .from('comments')
    .insert(row)
    .select()
    .single();
  if (error) { console.error('[GRIFF] insertComment error:', error); return null; }
  return data;
}

async function updateCommentResolved(commentId, isResolved) {
  if (!sb) return null;
  const { data, error } = await sb
    .from('comments')
    .update({ is_resolved: isResolved })
    .eq('id', commentId)
    .select()
    .single();
  if (error) { console.error('[GRIFF] updateResolved error:', error); return null; }
  return data;
}

async function deleteComment(commentId) {
  if (!sb) return null;
  const { error } = await sb
    .from('comments')
    .delete()
    .eq('id', commentId);
  if (error) { console.error('[GRIFF] deleteComment error:', error); return null; }
  return true;
}

function subscribeComments(callback) {
  if (!sb) return null;
  const channel = sb
    .channel('comments-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `project_id=eq.${PROJECT_ID}` }, (payload) => {
      callback(payload);
    })
    .subscribe();
  return channel;
}

// 전역 접근용
window.__griffSupabase = {
  initSupabase,
  getSupabase,
  getProjectId,
  fetchComments,
  insertComment,
  updateCommentResolved,
  deleteComment,
  subscribeComments,
};
