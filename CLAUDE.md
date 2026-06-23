@AGENTS.md

# 에이코치 (A-Coach) — 프로젝트 메모

> 새 작업 세션을 시작할 때 Claude가 이 파일을 먼저 읽고 맥락을 파악합니다.
> 기능을 추가/변경할 때마다 아래 "진행 상황"을 갱신하세요.

## 🚩 다음 세션 빠른 시작 (핸드오프 · 2026-06-23)

**▶ 다음 작업: 건강검진 입력 → 목표 조정** (또는 알림·리마인더 / 캘린더 뷰 중 택1)
`HealthCheckup` 타입은 정의돼 있으나 미구현. 입력 화면(연 1건, `users/{uid}/healthCheckups/{year}`)을 만들고, 공복혈당·혈압·체중 등을 받아 목표(칼로리·단백질·목표혈당)에 반영하는 흐름. 순수 계산은 `utils/`, 외부 연동은 `services/`.

**✅ 직전 완료: "오늘의 코칭 카드" (커밋·배포 대기)**
- 새 파일 `utils/coach.ts` — 순수 함수 `getCoachTips(input)`. 남은 칼로리·단백질·목표모드·시간대 기반으로 코치 멘트 1~2줄 생성. 아침 빈 상태/단백질 부족/칼로리 초과·여유를 감량·유지·증량별로 다르게 안내. 초과 시 "N분 걷기" 환산(MET 3.5, 10~60분).
- 변경 `app/(tabs)/index.tsx` — 단백질 게이지 아래 "🧑‍🏫 오늘의 코칭" 카드 추가(상위 2개 표시). `getCoachTips` 호출 + coachCard 스타일.
- ⚠️ **이 세션도 리눅스 미러 깨짐**(bash가 파일을 잘린 상태로 봄 → git/tsc 불가). 파일 도구로만 작업함. **노트북에서 직접 검증·커밋·배포 필요**: 폰에서 PWA 새로고침 → 홈 코칭 카드 확인 → `git add -A && git commit -m "코칭 카드"` → `npx expo export -p web` → `npx gh-pages -d dist --dotfiles`.

**✅ 브랜딩: 로고·아이콘 (커밋·배포 대기)**
- 힉스필드(Higgsfield, nano_banana_pro)로 3D 글로시 마스코트 + "A" 로고 생성. 블루 캡슐 캐릭터(친근한 헬스 트레이너) + 가슴 "A".
- 선택 로고(logo_1)를 앱 아이콘 전체에 적용: `assets/images/icon.png`(1024)·`favicon.png`(196)·`splash-icon.png`(1024), `public/icon-192.png`·`public/icon-512.png`. app.json·manifest.json은 경로 동일 → 파일만 교체.
- ⚠️ **안드로이드 적응형 아이콘**(android-icon-foreground 등)은 투명 배경 작업 필요해서 미적용 — 추후.
- 코칭 카드 아바타: A_3(가슴 "A") 배경제거 투명본을 `assets/images/coach-avatar.png`(512, RGBA)로 저장 → 홈 코칭 카드 🧑‍🏫 이모지를 `<Image>`로 교체 완료(coachAvatar 스타일 32px 원형). 원본 투명본: coach-avatar-source.png.

**현재 상태**: Day 1~6 + PWA + Gemini 프록시 전환 완료·배포·푸시됨. 코칭 카드 코드 + 로고/아이콘 교체 완료, 커밋/배포 대기.
- 라이브 PWA: https://yunagunwoo-netizen.github.io/acoach/
- 흐름: 프로필·목표모드 → 사진 식단분석(프록시) → 식약처 보정 → 식사·운동 기록 → 체성분 추이 → 일·주간 통계. 홈 = 칼로리수지(목표−섭취+운동) + 단백질 게이지.

**⚠️ 작업 환경 필수 주의**
- 경로에 띄어쓰기("내 드라이브") → 명령은 **항상 따옴표**: `cd "C:\Users\ggyeo\내 드라이브\dev\에이코치\acoach"`
- **여러 노트북 + 구글드라이브 동기화** 사용 → 작업 시작 전 `git pull` 먼저, 두 노트북에서 동시에 git 만지지 말 것(.git 동기화 충돌·잠금 위험).
- git 잠금 에러(HEAD.lock/index.lock) → `Remove-Item .git\*.lock -Force` 후 재시도.
- 배포: `npx expo export -p web` → `npx gh-pages -d dist --dotfiles` (⚠️ `-t true`는 에러, `--dotfiles`만). export가 typedRoutes 타입 자동 재생성.
- **Gemini 키를 EXPO_PUBLIC_로 번들에 넣지 말 것** — 프록시 사용. Worker: https://acoach-gemini.ggyeong567.workers.dev (Cloudflare 계정 Ggyeong567@gmail.com). 키 교체 시 Worker 시크릿만 변경. 번들에 키 들어가면 GitHub push protection이 막음.
- GitHub: yunagunwoo-netizen/acoach (main). 검증은 폰에서 PWA 새로고침.

**다음 후보(코칭 카드 이후)**: 건강검진 입력→목표 조정 / 알림·리마인더 / 캘린더 뷰.

**비즈니스 맥락**: 언노운짐(양천구청점·응암점) 회원 서비스로 차별화. 2026 혁신 소상공인 AI 활용지원 사업 신청 준비(뼈대: `../언노운짐_에이코치_사업계획서_뼈대.md`, 신청 ~7/3). 북극성 = 칼로리 수지 + 근육량을 식단·다양한 운동으로 조절.

---

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
- `services/` — 외부 연동 (firebase, auth, users, gemini[프록시 호출], foodDb, meals, exercises, bodyComposition)
- `contexts/` — 전역 상태 (auth-context)
- `utils/` — 순수 계산 함수 (calories, date, exercise[MET 프리셋])
- `types/` — 타입 정의 (UserProfile, Meal, Exercise, BodyComposition, HealthCheckup, DailySummary)
- `components/`, `constants/`, `hooks/` — 템플릿 기본(일부 사용)

## 환경 변수 (.env, git 제외됨)
`EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_GEMINI_PROXY_URL`, `EXPO_PUBLIC_FOOD_API_KEY`
※ EXPO_PUBLIC_ 값은 앱 번들에 포함됨(공개됨). Firebase·식약처 키는 개인용 한정 노출 감수.
※ ⚠️ **Gemini 키는 번들에 넣지 말 것.** Cloudflare Worker 프록시 뒤(시크릿)에만 존재하고, 앱엔 프록시 주소(`EXPO_PUBLIC_GEMINI_PROXY_URL`)만 들어감. (아래 '보안: 프록시 전환' 참고)

## 데이터 구조 (Firestore)
- `users/{uid}` — UserProfile
- `users/{uid}/meals/{mealId}` — Meal (Day 2)
- `users/{uid}/exercises/{id}` — Exercise (Day 5)
- `users/{uid}/bodyComposition/{date}` — BodyComposition (Day 5, 하루 1건·date=문서ID·덮어씀)
- `users/{uid}/healthCheckups/{year}` — HealthCheckup (타입만 정의, 미구현)
- `users/{uid}/dailySummary/{date}` — DailySummary (타입만 정의, 미구현)

## 라우팅/인증 흐름
`app/_layout.tsx`가 로그인 상태로 분기:
비로그인→/login, 로그인+프로필없음→/profile-setup, 정상→/(홈)

## 진행 상황
- [x] Day 0: 환경 세팅, Firebase/Gemini/식약처 키 확보
- [x] Day 1: SDK54 프로젝트, 폴더구조/타입, Firebase 연동, 로그인/회원가입, 프로필 입력 + 목표 칼로리 자동 계산, 홈(요약)
- [x] Day 2: 카메라/갤러리 → Gemini(2.5 Flash, 구조화 출력) 분석 → 결과(수정 가능) → meals 저장. 홈에 섭취/남은 칼로리·식사 목록·삭제(길게누르기) 반영.
  - 새 파일: services/gemini.ts, services/meals.ts, utils/date.ts, app/add-meal.tsx
  - 변경: app/(tabs)/index.tsx(홈), app/_layout.tsx(add-meal 라우트), app.json(expo-image-picker 권한)
  - 의존성 추가 필요: expo-image-picker (npx expo install)
  - ⚠️ Gemini 키는 신형 "AQ." 형식 — REST 정상 작동 확인됨
- [x] Day 3: 식약처 식품영양성분 DB(통합) 연동 → 음식별 "식약처 보정"(검색→후보 선택→그램 입력→공식 영양값 적용). 타입체크 통과.
  - 새 파일: services/foodDb.ts, components/food-search-modal.tsx
  - 변경: app/add-meal.tsx(각 음식에 보정 버튼+모달)
  - 식약처 엔드포인트: https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02 (type=json, FOOD_NM_KR=음식명). AMT_NUM 매핑 1=kcal,3=단백,4=지방,6=탄수,7=당류 (100g 기준). EXPO_PUBLIC_FOOD_API_KEY 사용, https 필수.
  - 남은 보강(후순위): 인식 프롬프트 튜닝(실사용 오류 수집 후), 보정 출처 배지
- [x] Day 4: 목표 모드(감량/유지/증량) + 단백질 목표. 북극성=칼로리 수지 + 근육량 조절.
  - 변경: types(GoalMode·goalMode·targetProtein), utils/calories(GOAL_CALORIE_FACTOR 0.85/1.0/1.1, PROTEIN_PER_KG 2.0/1.6/1.8, calcGoalCalories·calcTargetProtein), services/meals(sumProtein), app/profile-setup(목표 선택), app/(tabs)/index(목표 탭 즉시변경+단백질 게이지)
  - 하위호환: 기존 프로필은 goalMode 미설정 → '유지'로 간주, targetProtein 없으면 체중기반 계산
  - ⚠️ 환경 글리치: 이 세션에서 리눅스 미러가 '기존 파일 수정'을 반영 안 해 tsc 자동검증 불가 → 원본(Read) 수동 검토로 확인. 폰 리로드가 실제 검증.
- [x] PWA 배포(GitHub Pages): 같은 코드를 웹으로 내보내 설치형 PWA로. 아이폰도 무료 설치.
  - 외부 API CORS 확인됨: Gemini(origin 반영), 식약처(`*`) → 웹에서 정상
  - 변경: services/firebase.ts(웹=브라우저 persistence+getFirestore, 네이티브=기존), app/add-meal.tsx(웹은 카메라→파일선택 폴백), app.json(experiments.baseUrl="/acoach")
  - 새 파일: app/+html.tsx(manifest·apple meta·SW등록), public/manifest.json, public/sw.js, public/.nojekyll, public/icon-192.png, public/icon-512.png
  - ⚠️ baseUrl="/acoach" → GitHub 저장소 이름은 반드시 `acoach` (다르면 baseUrl과 manifest/sw/+html의 "/acoach/" 경로 모두 변경)
  - 배포: `npx expo export -p web` → dist/ → `npx gh-pages -d dist -t`(.nojekyll 포함 위해 -t. ⚠️ `-t true`는 "too many arguments" 에러 — 값 없이 `-t`만). EXPO_PUBLIC_ 키는 로컬 export 시 번들에 인라인됨(공개 번들에 노출 — 가족용 한정 감수)
  - 웹 한계(경미): Alert.alert(식사 삭제 확인) 등 일부 RN-web UX 차이
- [x] 보안: Gemini 프록시 전환 (Cloudflare Worker). 키를 앱 번들에서 제거 → Worker 시크릿(GEMINI_API_KEY)에만 존재.
  - 변경: services/gemini.ts(직접호출→프록시 호출, x-goog-api-key 헤더 제거), .env(EXPO_PUBLIC_GEMINI_PROXY_URL 추가·기존 키 제거)
  - 새 파일: worker/gemini-proxy.js (Cloudflare 대시보드에 붙여넣어 배포. ALLOWED_ORIGINS로 github.io·localhost만 허용, Origin 검사로 남용 방지)
  - 배포된 Worker: `https://acoach-gemini.ggyeong567.workers.dev` (계정 Ggyeong567@gmail.com)
  - ⚠️ 앞으로 Gemini 키를 EXPO_PUBLIC_로 다시 넣지 말 것 — GitHub push protection이 차단 + 공개 노출됨. 키 교체 시 Worker 시크릿만 바꾸면 됨.
- [x] Day 5: 체성분 기록·추이 + 운동 기록(한 세션에 둘 다). 북극성=칼로리 수지(섭취−소모) + 근육량 조절.
  - 새 파일: types(ExerciseType·Exercise·BodyComposition), services/exercises.ts, services/bodyComposition.ts, utils/exercise.ts(MET 프리셋), app/add-exercise.tsx(모달), app/body.tsx
  - 변경: app/_layout.tsx(add-exercise 모달·body 라우트), app/(tabs)/index.tsx(운동 소모칼로리 반영·운동/체성분 진입버튼·오늘의 운동 목록)
  - 운동: 유산소/근력 프리셋 선택→시간 입력→소모칼로리 자동계산(calcCaloriesBurned, MET×체중×시간, 수정 가능). users/{uid}/exercises/{id}. 홈 남은칼로리=목표−섭취+소모.
  - 체성분: 체중(필수)·체지방률·골격근량 입력, 하루 1건(date=문서ID, 덮어씀). users/{uid}/bodyComposition/{date}. 추이는 라이브러리 없이 View 막대차트(지표 토글: 체중/체지방률/골격근량, 최근 12개).
  - 체중 저장 시 프로필 weight·targetCalories·targetProtein 자동 재계산(북극성 최신 유지).
  - ⚠️ typedRoutes 활성 → 새 라우트는 .expo/types/router.d.ts 재생성 필요(폰에서 expo start 시 자동). 이 세션은 tsc 통과 위해 수동 패치.
  - tsc --noEmit 통과. 폰 리로드가 실제 검증.
- [x] Day 6: 일·주간 요약 그래프 (app/stats.tsx). 최근 7/14일 식사·운동 집계 → 일별 막대(섭취/단백질/당류/순=섭취−운동) + 기간 요약(평균 섭취·단백질, 단백질 목표달성 일수, 운동소모 합).
  - 새 파일: app/stats.tsx (라이브러리 없이 View 막대 + 목표선, 지표/기간 토글)
  - 변경: services/meals.ts(getMealsSince), services/exercises.ts(getExercisesSince) — 단일 범위필터(date>=)라 인덱스 불필요, utils/date.ts(lastNDateKeys), app/_layout.tsx(stats 라우트), app/(tabs)/index.tsx(홈 '📊 통계' 진입버튼)
- [x] 오늘의 코칭 카드: utils/coach.ts(getCoachTips, 순수) + 홈 카드. 남은칼로리·단백질·목표모드·시간대 기반 1~2줄 제안. (코드 완료, 노트북에서 커밋·배포 필요)
- [ ] Day 7+: 실사용 검증 / 다음: 건강검진 입력→목표 조정, 알림·캘린더
- 이후 로드맵: `../에이코치_개발_로드맵.md` 참고

## 작업 규칙
- 한 세션 = 한 기능. 끝나면 git commit.
- 외부 API 호출은 services/, 계산은 utils/에. UI(screens)에서 분리 유지.
- 에러는 통째로 복사해서 공유.
