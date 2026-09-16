# 먀칭 (구 AI ROUTE) — 인터페이스 프로토타입

A Korean AI learning navigation service prototype. Static HTML, CSS and JavaScript with consultation, recommendations, mentor profiles, matching applications and a chat/booking workspace.

## Implemented

- A four-question interview (AI tool experience, goal category, prior knowledge, preferred format) opens immediately; every question takes a choice or free text.
- Category and experience based recommendations and a three-step learning route.
- Six mentor profiles with horizontal browsing, category filtering, career history and example outcomes.
- Detail-to-consultation flow retaining the selected mentor.
- Diagnosis completion transitions through a short matching screen into the best three recommendations, followed by the remaining mentors without duplication.
- Mentor availability examples, preferred schedule selection and matching requests carrying an immutable diagnosis snapshot.
- A contact list and one-to-one demo conversation with learner/mentor role switching, text messages and diagnosis attachments.
- Four matching stages: received, coordinating, confirmed, completed. The learner cannot send anything until the mentor accepts; accepting posts the mentor's first greeting, written from the diagnosis.
- Structured schedule proposals, versioned quotes, learner acceptance and reservation details.
- In-chat checkout with explicit test payment and a completion simulation. No card details are collected.
- Responsive layouts, keyboard form submission, accessible labels and reduced-motion support.

## Demo boundaries

Consultation is a deterministic scenario, not an LLM integration. All mentor names, careers, availability, rates and generated portraits are fictional examples. Messages stay in this browser session; the role switch lets a single tester experience both sides. No real matching request, booking or payment is transmitted. State lives only in memory and resets on reload. The UI shows these limits.

Quote and reservation actions validate the acting demo role, schedule, latest quote revision and stage. Payment cannot occur before reservation acceptance, and repeated payment clicks do not create a second receipt. The quoted amount is carried into the reservation and payment without recalculation. Completing a future lesson requires the explicitly labelled completion simulation.

The provided Netlify and UIBowl references could not be retrieved in this environment. The design implements the requested conversational entry, Netflix-style mentor shelves and detailed profiles; it does not claim to reproduce inaccessible references.

## Assets

`dist/assets/mentors.png` is an AI-generated 3 × 2 contact sheet containing six fictional adults. Generated for this prototype. Each portrait is rendered as a CSS background position, retaining the image proportions.

## Follow-up integration

Before live use, connect server-side AI, authenticated learner/mentor accounts, authorized instructor data, shared chat/matching storage, real availability and a payment provider with server-side verification/webhooks. The local demo role switch is not authentication. Add a live cancellation/refund policy before accepting real money.

## Validation

JavaScript syntax, static asset references, all mentor records and consultation state/ranking flows are checked locally. `node --experimental-vm-modules verify-matching.mjs` validates diagnosis snapshots, duplicate requests, schedule constraints, quote revisions, role/stage guards, idempotent test payments, completion and integrated page rendering. No browser QA was requested. WebMCP registration is feature-detected; there was no permitted supported browser context to verify it, so it remains unverified.

## 실행

정적 파일이라 서버가 필요 없지만, `dist/app.js`가 ES 모듈이라 `file://`로는 열리지 않습니다.

```bash
cd dist && python -m http.server 8765 --bind 127.0.0.1
```

검증: `node --experimental-vm-modules verify-matching.mjs`

## 화면

| 경로 | 화면 |
|---|---|
| `#/` | 홈 — 강사 사진 무한 배너 + 6개 분야 타일 + 강사 선반 (헤더는 스크롤 시 등장) |
| `#/chat` | AI 상담 — 인터뷰 4문항 (AI 도구 경험 → 목표 분야 → 사전 지식 → 수업 형식) → 진단서 |
| `#/finding` `#/recommendations` | 매칭 중 → 추천 TOP3 + 나머지 강사 |
| `#/mentors` `#/mentor/:id` | 강사 둘러보기 / 강사 프로필 |
| `#/apply/:id` | 매칭 신청 (진단서 편집 가능, 일정은 채팅에서 조율) |
| `#/messages` | 1:1 채팅 · 일정 제안 · 견적 · 예약 · 테스트 결제 (강사 수락 전에는 사용자 발신 잠김) |
| `#/teach` `#/teach/edit` | 강사 등록 / 프로필 수정 |
| `#/admin` | 운영 콘솔 — 강사 검수(승인·반려), 매칭 신청 현황 |

## 데이터

등록한 강사와 매칭 신청은 **방문자 브라우저의 localStorage**에만 저장됩니다. 서버로 전송되지 않고, 방문자끼리 공유되지도 않습니다. 운영 콘솔 하단의 `전부 지우고 처음부터`로 초기화할 수 있습니다.
