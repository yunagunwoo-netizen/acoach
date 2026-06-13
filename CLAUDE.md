@AGENTS.md

# 에이코치 (A-Coach) — 프로젝트 메모

> 새 작업 세션을 시작할 때 Claude가 이 파일을 먼저 읽고 맥락을 파악합니다.
> 기능을 추가/변경할 때마다 아래 "진행 상황"을 갱신하세요.

## 한 줄 소개
음식 사진을 찍으면 AI(Gemini)가 칼로리·영양·혈당 영향을 추정하고, 식단·운동·수면을 코칭하는 개인용 건강관리 앱. 가족·친구 소규모 공유 목표.

## 기술 스택 / 중요 제약
- React Native + Expo **SDK 54** (Expo Router, TypeScript)
  - ⚠️ SDK 55/56은 스토어 Expo Go로 못 엶(2026.5 정책). 반드시 SDK 54 유지.
- Firebase JS SDK (Auth 이메일/비번 + Firestore). Storage는 MVP 미사용(사진 원본 저장 안 함)
- 음식 분석: Gemini API (2.5 Flash, 비전) — 무료 한도
- 영양 보정: 식약처 식품영양성분 DB 공공 API

## 폴더 구조 (별칭 @/* → 프로젝트 루트)
- `app/` — 화면 + 라우팅 (Expo Router 파일 기반)
  - `app/(tabs)/index.tsx` = 홈, `(tabs)/_layout.tsx` = 현재 Stack(탭 없음)
  - `app/login.tsx`, `app/signup.tsx`, `app/profile-setup.tsx`
- `services/` — 외부 연동 (firebase, auth, users, [Day2: gemini, food-db])
- `contexts/` — 전역 상태 (auth-context)
- `utils/` — 순수 계산 함수 (calories)
- `types/` — 타입 정의 (UserProfile, Meal, HealthCheckup, DailySummary)
- `components/`, `constants/`, `hooks/` — 템플릿 기본(일부 사용)

## 환경 변수 (.env, git 제외됨)
`EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_FOOD_API_KEY`
※ EXPO_PUBLIC_ 값은 앱 번들에 포함됨(공개됨). Firebase 키는 무방, AI/식약처 키는 개인용 한정 위험 감수. 서비스 전환 시 서버 경유로 변경.

## 데이터 구조 (Firestore)
- `users/{uid}` — UserProfile
- `users/{uid}/meals/{mealId}` — Meal (Day 2)
- `users/{uid}/dailySummary/{date}` — DailySummary (Day 3)
- `users/{uid}/healthCheckups/{year}` — HealthCheckup (Day 5)

## 라우팅/인증 흐름
`app/_layout.tsx`가 로그인 상태로 분기:
비로그인→/login, 로그인+프로필없음→/profile-setup, 정상→/(홈)

## 진행 상황
- [x] Day 0: 환경 세팅, Firebase/Gemini/식약처 키 확보
- [x] Day 1: SDK54 프로젝트, 폴더구조/타입, Firebase 연동, 로그인/회원가입, 프로필 입력 + 목표 칼로리 자동 계산, 홈(요약)
- [ ] Day 2: 카메라/갤러리 → Gemini 분석 → 결과(수정 가능) → meals 저장
- [ ] Day 3: 식약처 영양 보정, 홈 섭취 현황
- [ ] Day 4: 실사용 검증
- 이후 로드맵: `../에이코치_개발_로드맵.md` 참고

## 작업 규칙
- 한 세션 = 한 기능. 끝나면 git commit.
- 외부 API 호출은 services/, 계산은 utils/에. UI(screens)에서 분리 유지.
- 에러는 통째로 복사해서 공유.
