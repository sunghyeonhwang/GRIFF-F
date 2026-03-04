-- ============================================
-- GRIFF Frame — Schema v3: 코멘트 고도화
-- ============================================
-- 실행 전: schema.sql, schema-v2.sql이 이미 적용되어 있어야 합니다.

-- 1. comments 테이블에 구간 코멘트용 끝 타임코드 컬럼 추가
ALTER TABLE comments ADD COLUMN IF NOT EXISTS timecode_end_seconds REAL;

-- timecode_end_seconds가 NULL이면 기존 단일 포인트 코멘트
-- timecode_end_seconds가 있으면 구간(range) 코멘트: timecode_seconds ~ timecode_end_seconds
