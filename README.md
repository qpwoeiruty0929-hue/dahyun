# 보이스피싱 지킴이 — 프론트엔드

원티드 AI Championship 2026 해커톤 제출작. 고령층 대상 보이스피싱 탐지 서비스의 **프론트엔드(화면)** 파트.

## 화면 구성

- **업로드 화면**: 문자·카톡 캡처 사진 또는 통화 녹음 파일 선택 → `검사하기`
- **결과 화면**: 위험도(4단계), 요약, 근거, 지금 할 행동, 신고 전화 버튼, 안내문, 피드백 버튼

## 파일

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 뼈대 |
| `style.css` | 디자인 (큰 글씨·큰 버튼, 반응형) |
| `app.js` | 동작 (파일 선택, API 호출, 결과 표시, 피드백) |
| `manifest.json` | PWA 설정 (홈 화면 아이콘) |

## 로컬에서 실행하기

VS Code 에서 `Live Server` 확장을 설치하고 `index.html` 에서 우클릭 → `Open with Live Server`.

또는 터미널에서:

```bash
npx serve .
```

## 백엔드 연결

`app.js` 맨 위 `CONFIG` 만 수정합니다.

```js
const CONFIG = {
  API_BASE_URL: "http://localhost:8000", // 팀원 C에게 받은 주소로 교체
  MOCK_MODE: true,                        // 연결되면 false 로 변경
};
```

`MOCK_MODE: true` 이면 서버 없이 가짜 결과로 화면을 테스트할 수 있습니다.

## 공통 데이터 형식 (4개 파트 공유)

요청 `POST /analyze`

```json
{ "type": "text | image | audio", "content": "..." }
```

- 프론트엔드는 `image` / `audio` 만 전송하며, `content` 는 파일의 **base64 문자열**(data URI 접두어 제외).

응답

```json
{
  "request_id": "고유 ID",
  "risk_level": "안전 | 의심 | 경고 | 위험",
  "score": 0,
  "summary": "한 문장 요약",
  "reason": ["근거1", "근거2"],
  "action_guide": {
    "headline": "지금 해야 할 행동 한 줄",
    "steps": ["1단계", "2단계"],
    "contacts": [{ "label": "기관명", "phone": "전화번호" }]
  },
  "notify_guardian": true,
  "disclaimer": "이 결과는 AI의 참고용 판단이며 실제와 다를 수 있습니다"
}
```

요청 `POST /feedback`

```json
{ "request_id": "...", "was_correct": true }
```

## 배포 (Vercel)

1. 이 저장소를 GitHub 에 push
2. [vercel.com](https://vercel.com) 가입 → `Add New Project` → 이 저장소 선택
3. 설정 그대로 `Deploy` (정적 사이트라 빌드 설정 불필요)
4. 발급된 주소를 휴대폰으로 열어 전체 흐름 테스트

## 할 일

- [ ] PWA 아이콘 `icon-192.png`, `icon-512.png` 추가
- [ ] 팀원 C 백엔드 주소 연결 후 `MOCK_MODE: false`
- [ ] 실제 피싱/정상 캡처로 테스트
- [ ] 휴대폰 접속 테스트
