/* =========================================================
   보이스피싱 지킴이 — 동작 스크립트 (app.js)

   [초보자 안내]
   - 이 파일이 화면의 "동작"을 담당합니다.
   - 지금은 MOCK_MODE 가 true 라서 백엔드 서버 없이도 가짜 결과가 나옵니다.
   - 팀원 C에게 진짜 API 주소를 받으면 아래 CONFIG 두 줄만 바꾸면 됩니다.
   ========================================================= */

// ================= 설정 (여기만 고치면 됨) =================
const CONFIG = {
  // 팀원 C에게 받은 백엔드 주소로 교체 (예: "https://my-api.onrender.com")
  API_BASE_URL: "http://localhost:8000",

  // true  = 서버 없이 가짜 결과로 테스트
  // false = 진짜 백엔드 API 호출
  MOCK_MODE: true,
};

// ================= 공통 응답 형식 (4개 파트 공유 약속) =================
// {
//   request_id, risk_level("안전"|"의심"|"경고"|"위험"), score(0~100),
//   summary, reason:[...],
//   action_guide: { headline, steps:[...], contacts:[{label, phone}] },
//   notify_guardian: true|false, disclaimer
// }

// ================= 화면 전환 도우미 =================
const screens = ["upload", "loading", "result", "error"];
function showScreen(name) {
  screens.forEach((s) => {
    document.getElementById("screen-" + s).hidden = s !== name;
  });
  window.scrollTo(0, 0);
}

// ================= 상태 저장 =================
let selectedFile = null;      // 사용자가 고른 파일
let selectedType = null;       // "image" 또는 "audio"
let lastRequestId = null;      // 피드백 전송에 사용

// ================= 요소 참조 =================
const fileInput = document.getElementById("file-input");
const previewArea = document.getElementById("preview-area");
const previewImage = document.getElementById("preview-image");
const previewAudioWrap = document.getElementById("preview-audio-wrap");
const previewAudioName = document.getElementById("preview-audio-name");
const analyzeBtn = document.getElementById("analyze-btn");
const uploadLabel = document.getElementById("upload-label");

// ================= 1. 파일 선택 처리 =================
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;

  if (file.type.startsWith("image/")) {
    selectedType = "image";
    const url = URL.createObjectURL(file);
    previewImage.src = url;
    previewImage.hidden = false;
    previewAudioWrap.hidden = true;
  } else if (file.type.startsWith("audio/")) {
    selectedType = "audio";
    previewImage.hidden = true;
    previewAudioWrap.hidden = false;
    previewAudioName.textContent = file.name;
  } else {
    alert("사진 또는 녹음 파일만 올릴 수 있어요.");
    resetFile();
    return;
  }

  previewArea.hidden = false;
  uploadLabel.hidden = true;
  analyzeBtn.disabled = false;
});

// 파일 다시 선택
document.getElementById("clear-file-btn").addEventListener("click", resetFile);
function resetFile() {
  selectedFile = null;
  selectedType = null;
  fileInput.value = "";
  previewArea.hidden = true;
  uploadLabel.hidden = false;
  analyzeBtn.disabled = true;
}

// ================= 2. 파일을 base64 문자열로 변환 =================
// 백엔드 공통 형식의 content 에 담아 보냅니다.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result 예: "data:image/png;base64,iVBORw0KG..."
      // 콤마 뒤의 순수 base64 부분만 사용
      const base64 = String(reader.result).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ================= 3. 검사하기 버튼 =================
analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  showScreen("loading");

  try {
    const content = await fileToBase64(selectedFile);
    const requestBody = { type: selectedType, content: content };

    let result;
    if (CONFIG.MOCK_MODE) {
      result = await mockAnalyze(selectedType);
    } else {
      const res = await fetch(CONFIG.API_BASE_URL + "/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) throw new Error("서버 오류: " + res.status);
      result = await res.json();
    }

    lastRequestId = result.request_id;
    renderResult(result);
    showScreen("result");
  } catch (err) {
    console.error(err);
    showScreen("error");
  }
});

// ================= 4. 결과 화면 그리기 =================
function renderResult(data) {
  // 위험도 배너
  const banner = document.getElementById("risk-banner");
  banner.dataset.level = data.risk_level;
  document.getElementById("risk-level-text").textContent = data.risk_level;
  document.getElementById("risk-score-text").textContent =
    "위험도 " + data.score + "점";

  // 요약
  document.getElementById("result-summary").textContent = data.summary;

  // 행동 가이드
  const guide = data.action_guide || {};
  document.getElementById("action-headline").textContent = guide.headline || "";

  const stepsEl = document.getElementById("action-steps");
  stepsEl.innerHTML = "";
  (guide.steps || []).forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    stepsEl.appendChild(li);
  });

  // 연락처: 탭하면 바로 전화 걸리는 버튼
  const urgent = data.risk_level === "위험" || data.risk_level === "경고";
  const contactsEl = document.getElementById("action-contacts");
  contactsEl.innerHTML = "";
  (guide.contacts || []).forEach((c) => {
    const a = document.createElement("a");
    a.className = "contact-btn";
    a.dataset.urgent = String(urgent);
    a.href = "tel:" + String(c.phone).replace(/[^0-9+]/g, "");
    a.innerHTML =
      '<svg aria-hidden="true"><use href="#i-phone"/></svg>' +
      '<span class="contact-label">' + c.label + "</span>" +
      '<span class="contact-phone">' + c.phone + "</span>";
    contactsEl.appendChild(a);
  });

  // 근거
  const reasonEl = document.getElementById("result-reason");
  reasonEl.innerHTML = "";
  (data.reason || []).forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r;
    reasonEl.appendChild(li);
  });

  // 보호자 알림 안내
  document.getElementById("guardian-notice").hidden = !data.notify_guardian;

  // 고정 안내문 (서버가 준 문구가 있으면 사용)
  if (data.disclaimer) {
    document.getElementById("result-disclaimer").textContent = data.disclaimer;
  }

  // 피드백 버튼 초기화
  resetFeedback();
}

// ================= 5. 피드백 전송 =================
const feedbackBtns = document.querySelectorAll(".feedback-btn");
feedbackBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const wasCorrect = btn.dataset.correct === "true";
    feedbackBtns.forEach((b) => (b.disabled = true));

    try {
      if (!CONFIG.MOCK_MODE) {
        await fetch(CONFIG.API_BASE_URL + "/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: lastRequestId,
            was_correct: wasCorrect,
          }),
        });
      } else {
        console.log("[MOCK] 피드백 전송:", {
          request_id: lastRequestId,
          was_correct: wasCorrect,
        });
      }
    } catch (err) {
      console.error("피드백 전송 실패:", err);
    }

    document.getElementById("feedback-thanks").hidden = false;
  });
});

function resetFeedback() {
  feedbackBtns.forEach((b) => (b.disabled = false));
  document.getElementById("feedback-thanks").hidden = true;
}

// ================= 6. 다시 시작 =================
document.getElementById("restart-btn").addEventListener("click", () => {
  resetFile();
  showScreen("upload");
});
document.getElementById("error-retry-btn").addEventListener("click", () => {
  resetFile();
  showScreen("upload");
});

// ================= 7. 가짜(MOCK) 응답 =================
// 백엔드가 준비되기 전에 화면을 테스트하기 위한 임시 데이터입니다.
function mockAnalyze(type) {
  const samples = {
    image: {
      request_id: "mock-img-" + Date.now(),
      risk_level: "위험",
      score: 92,
      summary: "택배 배송을 사칭한 스미싱(문자 사기) 메시지입니다.",
      reason: [
        "출처를 알 수 없는 인터넷 주소(링크)를 누르라고 유도합니다.",
        "'주소가 잘못되었다'며 개인정보 입력을 요구하는 전형적인 수법입니다.",
        "실제 택배사는 문자로 개인정보나 결제를 요구하지 않습니다.",
      ],
      action_guide: {
        headline: "링크를 절대 누르지 마세요",
        steps: [
          "문자 속 링크(인터넷 주소)를 누르지 마세요.",
          "이 문자를 삭제하세요.",
          "택배가 궁금하면 택배사 공식 대표번호로 직접 전화해 확인하세요.",
          "이미 링크를 눌렀다면 가족이나 경찰(112)에 알리세요.",
        ],
        contacts: [
          { label: "경찰 신고", phone: "112" },
          { label: "보이스피싱 통합신고", phone: "1332" },
        ],
      },
      notify_guardian: true,
      disclaimer: "이 결과는 AI의 참고용 판단이며 실제와 다를 수 있습니다",
    },
    audio: {
      request_id: "mock-aud-" + Date.now(),
      risk_level: "의심",
      score: 58,
      summary:
        "은행 직원을 사칭했을 가능성이 있습니다. 직접 확인이 필요합니다.",
      reason: [
        "통화에서 '계좌가 도용되었다'는 표현이 나옵니다.",
        "상대방이 특정 앱 설치를 안내하고 있습니다.",
      ],
      action_guide: {
        headline: "먼저 전화를 끊고 직접 확인하세요",
        steps: [
          "방금 걸려온 번호로 다시 걸지 마세요. 조작된 번호일 수 있습니다.",
          "은행 공식 대표번호를 직접 검색해서 전화해 사실을 확인하세요.",
          "확실하지 않으면 자녀나 가족에게 먼저 물어보세요.",
        ],
        contacts: [
          { label: "금융감독원", phone: "1332" },
          { label: "보이스피싱 통합신고", phone: "112" },
        ],
      },
      notify_guardian: false,
      disclaimer: "이 결과는 AI의 참고용 판단이며 실제와 다를 수 있습니다",
    },
  };

  return new Promise((resolve) => {
    setTimeout(() => resolve(samples[type] || samples.image), 1200);
  });
}

// ================= 시작 =================
showScreen("upload");
