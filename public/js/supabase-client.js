// ============================================
// GRIFF Frame — Supabase Client
// ============================================
// Supabase JS v2 CDN (ESM)
// index.html에서 importmap 또는 직접 import로 로드

const SUPABASE_URL = window.__GRIFF_ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.__GRIFF_ENV?.SUPABASE_ANON_KEY || '';

let supabase = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[GRIFF] Supabase 환경변수 미설정 — 로컬 모드로 동작합니다.');
    return null;
  }

  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('[GRIFF] Supabase 연결 완료');
  return supabase;
}

function getSupabase() {
  return supabase;
}

// 전역 접근용
window.__griffSupabase = { initSupabase, getSupabase };
