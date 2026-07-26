// ── PDF.js Worker 명시 설정 ──
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

window.pdfDoc = null;
window.currentPage = 1;
window.currentScale = 1.5;
let tool = null;
let pageNotes = {};
let undoStack = [];
let pendingTextPos = null;
let selectedNote = null;
let dragOffset = { x: 0, y: 0 };

// ── 언어별 텍스트 데이터 ──
const i18n = {
  ko: {
    appTitle: 'PDF Annotator v1.0',
    fileSelect: '파일 선택',
    highlight: '🖊 형광펜',
    text: '📝 텍스트',
    undo: '↩ 실행취소',
    clear: '🗑 초기화',
    save: '💾 저장',
    export: '📤 내보내기',
    import: '📥 불러오기',
    toolDescTitle: '도구 설명',
    toolDesc1: '형광펜: 클릭 위치에 하이라이트',
    toolDesc2: '텍스트: 클릭 후 텍스트 입력',
    ad1: '유레일 패스 프로모션 1',
    ad2: '유레일 패스 프로모션 2',
    ad3: '유레일 패스 프로모션 3',
    saved: '저장 완료!',
    noUndo: '이 페이지에서 되돌릴 내용이 없습니다.',
    jsonPrompt: 'JSON 데이터를 입력하세요:',
    jsonError: '유효하지 않은 JSON 형식입니다.',
    modalTitle: '텍스트 입력',
    modalPlaceholder: '내용을 입력하세요',
    cancel: '취소',
    confirm: '확인',
  },
  en: {
    appTitle: 'PDF Annotator v1.0',
    fileSelect: 'Select File',
    highlight: '🖊 Highlight',
    text: '📝 Text',
    undo: '↩ Undo',
    clear: '🗑 Clear',
    save: '💾 Save',
    export: '📤 Export',
    import: '📥 Import',
    toolDescTitle: 'Tool Instructions',
    toolDesc1: 'Highlight: Click to add highlight',
    toolDesc2: 'Text: Click to insert text',
    ad1: 'Eurail Pass Promo 1',
    ad2: 'Eurail Pass Promo 2',
    ad3: 'Eurail Pass Promo 3',
    saved: 'Saved successfully!',
    noUndo: 'Nothing to undo on this page.',
    jsonPrompt: 'Enter JSON data:',
    jsonError: 'Invalid JSON format.',
    modalTitle: 'Enter Text',
    modalPlaceholder: 'Type here...',
    cancel: 'Cancel',
    confirm: 'OK',
  },
};

// ── 언어 감지 및 텍스트 반환 ──
function getLanguage() {
  const userLang = navigator.language || navigator.userLanguage;
  return userLang.startsWith('ko') ? 'ko' : 'en';
}

function getText(key) {
  const lang = getLanguage();
  return i18n[lang][key] || key;
}

// ── UI 언어 자동 적용 ──
function applyAutoLanguage() {
  const lang = getLanguage();
  const t = i18n[lang];

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });

  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    if (t[key]) el.placeholder = t[key];
  });
}

// ── DOM 로드 후 초기화 ──
window.addEventListener('DOMContentLoaded', () => {
  applyAutoLanguage();
  initCanvasEvents();

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        loadPDF(url);
      }
    });
  }

  const textInput = document.getElementById('textInput');
  if (textInput) {
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmTextModal();
      if (e.key === 'Escape') closeTextModal();
    });
  }
});

// ── 페이지별 노트 반환 ──
function getNotes(page) {
  if (!pageNotes[page]) pageNotes[page] = [];
  return pageNotes[page];
}

// ── 히스토리 저장 ──
function saveHistory() {
  const page = window.currentPage;
  undoStack.push({ page, notes: JSON.stringify(getNotes(page)) });
}

// ── Undo ──
function undo() {
  const page = window.currentPage;
  for (let i = undoStack.length - 1; i >= 0; i--) {
    if (undoStack[i].page === page) {
      pageNotes[page] = JSON.parse(undoStack[i].notes);
      undoStack.splice(i, 1);
      renderPage(page);
      return;
    }
  }
  alert(getText('noUndo'));
}

// ── PDF 로드 ──
function loadPDF(url) {
  pageNotes = {};
  undoStack = [];
  pdfjsLib.getDocument(url).promise.then((pdf) => {
    window.pdfDoc = pdf;
    window.currentPage = 1;
    renderPage(1);
    if (window.updatePageInfo) window.updatePageInfo();
  });
}

// ── 페이지 렌더링 (뒤집힘 원인 완전 차단) ──
function renderPage(num) {
  if (!window.pdfDoc) return;
  window.pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale: window.currentScale });
    const canvas = document.getElementById('pdfCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // [핵심] 캔버스 해상도 조정 및 변환 행렬 리셋 (뒤집힘 방지)
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const renderTask = page.render({ canvasContext: ctx, viewport });
    const renderPromise = renderTask.promise ?? renderTask;

    renderPromise.then(() => {
      // PDF 렌더링 완료 후 Transform 초기화 상태에서 노트 출력
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawNotes(ctx, num);
    });
  });
}

// ── 배율 조절 ──
function zoomIn() {
  if (window.currentScale >= 3.0) return;
  window.currentScale = Math.round((window.currentScale + 0.25) * 100) / 100;
  updateZoomLabel();
  renderPage(window.currentPage);
}
function zoomOut() {
  if (window.currentScale <= 0.5) return;
  window.currentScale = Math.round((window.currentScale - 0.25) * 100) / 100;
  updateZoomLabel();
  renderPage(window.currentPage);
}
function setZoom(val) {
  const scale = parseFloat(val);
  if (isNaN(scale) || scale < 0.5 || scale > 3.0) return;
  window.currentScale = scale;
  updateZoomLabel();
  renderPage(window.currentPage);
}
function updateZoomLabel() {
  const sel = document.getElementById('zoomSelect');
  if (sel) sel.value = window.currentScale;
}

// ── 노트 드로잉 (색상 적용 보완) ──
function drawNotes(ctx, page) {
  const notes = getNotes(page);
  notes.forEach((n) => {
    if (n.type === 'highlight') {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = n.color || '#ffff00';
      ctx.fillRect(n.x - 40, n.y - 10, 80, 20);
      ctx.restore();
    }
    if (n.type === 'text') {
      ctx.save();
      // 선택된 글자 색상 사용 (기본값: 빨간색/검은색 등)
      ctx.fillStyle = n.color || '#d32f2f';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(n.text, n.x, n.y);
      ctx.restore();
    }
  });
}

// ── 툴 선택 ──
function setTool(t) {
  tool = t;
}

// ── 좌표 추출 ──
function getCanvasPos(e) {
  const canvas = document.getElementById('pdfCanvas');
  const rect = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {
    x: src.clientX - rect.left,
    y: src.clientY - rect.top,
  };
}

// ── 노트 탐색 ──
function findNoteAtPosition(pos) {
  const notes = getNotes(window.currentPage);
  return notes.find((n) => {
    if (n.type === 'text') {
      return Math.abs(pos.x - n.x) < 50 && Math.abs(pos.y - n.y) < 20;
    }
    if (n.type === 'highlight') {
      return (
        pos.x >= n.x - 40 &&
        pos.x <= n.x + 40 &&
        pos.y >= n.y - 10 &&
        pos.y <= n.y + 10
      );
    }
    return false;
  });
}

// ── 상호작용 (마우스 & 터치 통합) ──
function handleCanvasInteraction(pos) {
  const page = window.currentPage;
  const colorEl =
    document.getElementById('textColor') ||
    document.getElementById('highlightColor');
  const selectedColor = colorEl ? colorEl.value : '#d32f2f';

  if (tool === 'highlight') {
    saveHistory();
    getNotes(page).push({
      type: 'highlight',
      x: pos.x,
      y: pos.y,
      color: document.getElementById('highlightColor')?.value || '#ffff00',
    });
    renderPage(page);
  } else if (tool === 'text') {
    pendingTextPos = pos;
    openTextModal();
  }
}

// ── 캔버스 이벤트 리스너 등록 ──
function initCanvasEvents() {
  const canvasEl = document.getElementById('pdfCanvas');
  if (!canvasEl) return;

  canvasEl.addEventListener('mousedown', (e) => {
    const pos = getCanvasPos(e);
    const note = findNoteAtPosition(pos);

    if (note) {
      selectedNote = note;
      dragOffset.x = pos.x - note.x;
      dragOffset.y = pos.y - note.y;
    } else {
      selectedNote = null;
      handleCanvasInteraction(pos);
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!selectedNote) return;
    const pos = getCanvasPos(e);
    selectedNote.x = pos.x - dragOffset.x;
    selectedNote.y = pos.y - dragOffset.y;
    renderPage(window.currentPage);
  });

  document.addEventListener('mouseup', () => {
    if (selectedNote) {
      saveHistory();
    }
    selectedNote = null;
  });

  // 터치 이벤트
  canvasEl.addEventListener(
    'touchend',
    (e) => {
      if (e.changedTouches.length > 0) {
        const pos = getCanvasPos(e.changedTouches[0]);
        handleCanvasInteraction(pos);
      }
    },
    { passive: true },
  );
}

// ── 텍스트 모달 제어 ──
function openTextModal() {
  const modal = document.getElementById('textModal');
  const input = document.getElementById('textInput');
  if (!modal || !input) return;

  input.value = '';
  modal.classList.add('active');
  setTimeout(() => input.focus(), 100);
}

function closeTextModal() {
  const modal = document.getElementById('textModal');
  if (modal) modal.classList.remove('active');
  pendingTextPos = null;
}

function confirmTextModal() {
  const input = document.getElementById('textInput');
  const text = input ? input.value.trim() : '';

  if (!text || !pendingTextPos) {
    closeTextModal();
    return;
  }

  saveHistory();
  const page = window.currentPage;

  // 글자 색상 선택 팔레트 확인 (없으면 기본 빨간색 #d32f2f)
  const textColorEl =
    document.getElementById('textColor') ||
    document.getElementById('highlightColor');
  const textColor = textColorEl ? textColorEl.value : '#d32f2f';

  getNotes(page).push({
    type: 'text',
    text: text,
    x: pendingTextPos.x,
    y: pendingTextPos.y,
    color: textColor, // 색상 지정 저장
  });

  closeTextModal();
  renderPage(page);
}

// ── 단축키 ──
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('textModal');
  if (modal && modal.classList.contains('active')) return;

  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
    zoomIn();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    zoomOut();
  }
});

// ── 저장 / 불러오기(파일 선택) / 내보내기(파일 다운로드) / 초기화 ──

function saveToBrowser() {
  localStorage.setItem('pdfNotes', JSON.stringify(pageNotes));
  alert(getText('saved'));
}

// 1. [불러오기] 버튼 클릭 시 숨겨진 파일 선택창(input)을 트리거
function importJSON() {
  const fileInput = document.getElementById('jsonFileInput');
  if (fileInput) {
    fileInput.value = ''; // 동일한 파일을 다시 선택할 수 있도록 초기화
    fileInput.click();
  }
}

// 2. 파일 선택 시 실행되는 함수 (FileReader 사용)
function handleJSONFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      saveHistory();
      const loadedNotes = JSON.parse(e.target.result);

      if (typeof loadedNotes === 'object' && loadedNotes !== null) {
        pageNotes = loadedNotes;
        renderPage(window.currentPage);
      } else {
        alert(getText('jsonError'));
      }
    } catch (err) {
      alert(getText('jsonError'));
    }
  };

  reader.readAsText(file);
}

// 3. [내보내기] 클릭 시 파일(pdf_annotations.json)로 자동 다운로드
function exportJSON() {
  const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(pageNotes, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', 'pdf_annotations.json');
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function clearNotes() {
  saveHistory();
  pageNotes[window.currentPage] = [];
  renderPage(window.currentPage);
}
