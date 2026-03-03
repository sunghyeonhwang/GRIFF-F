# 🎯 APP MISSION

## Project Name
GRIFF Frame

## Mission Statement
영상 제작팀과 클라이언트 간의 피드백 워크플로우를 하나의 도구로 통합하여, Slack/YouTube에 흩어진 코멘트를 타임라인 기반으로 체계화하고 Premiere Pro와 직접 연동되는 협업 플랫폼.

## Problem Statement
현재 영상 피드백을 Slack 메시지와 YouTube 코멘트로 주고받고 있어, 피드백이 흩어지고 특정 타임코드를 정확히 지칭하기 어렵다. 수정 요청과 반영 여부를 추적하기 힘들고, 피드백을 편집 소프트웨어에 수동으로 옮기는 과정에서 시간이 낭비된다.

## Target Users
- 내부 영상 제작팀 (약 5명) - 편집자, 디렉터 등
- 외부 클라이언트 (프로젝트당 약 3명) - 리뷰 및 승인 담당

## App Type
- [x] Personal/Private Use (소규모 팀 + 제한된 클라이언트)
- [ ] Public/Commercial

## Core Features (v1)
1. **Vimeo 영상 URL 등록 및 재생** - Vimeo 링크를 등록하면 인앱 플레이어로 바로 재생
2. **타임라인 기반 코멘트/피드백** - 영상의 특정 타임코드에 코멘트를 남기고, 타임라인 위에 마커로 시각화
3. **코멘트 XML 내보내기** - 코멘트를 Premiere Pro 마커 형식의 XML로 다운로드하여 편집 프로젝트에 바로 임포트

## Anti-Scope (What this app will NOT do in v1)
- 영상 파일 직접 업로드/인코딩/호스팅 (Vimeo에 위임)
- 실시간 채팅 또는 메신저 기능
- 영상 편집 기능
- 결제/과금 시스템
- 버전 비교 (v2에서 검토)
- 프로젝트/폴더 기반 자산 관리 (v2에서 검토)
- 모바일 앱 (웹 우선)

## Success Metrics
| Metric | Target | Timeframe |
|--------|--------|-----------|
| 피드백 도구 전환율 | Slack/YouTube 대신 GRIFF Frame으로 100% 전환 | 3개월 |
| 팀 내 활성 사용자 | 5명 전원 주 1회 이상 사용 | 1개월 |
| 클라이언트 피드백 참여 | 초대된 클라이언트의 80% 이상이 직접 코멘트 작성 | 3개월 |

## Open Questions
- 클라이언트 접근 방식: 프로젝트별 초대 + 링크 공유 둘 다 지원 시, 링크 공유의 권한 범위는? 링크를 받은 사람은, 이름 입력 후 코멘트를 남길 수 있음
- Vimeo 연동 방식: oEmbed API로 충분한지, Vimeo API 직접 연동이 필요한지 - 배속등의 간단한 API연동 
- XML 내보내기 포맷: Premiere Pro 마커, Final Cut Pro, DaVinci Resolve, csv 선택 다운로드 
