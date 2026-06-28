window.pdfDoc = null;
window.currentPage = 1;
window.currentScale = 1.5;
let tool = null;

// ── 페이지별 노트 저장: { 1: [...], 2: [...], ... } ──
let pageNotes = {};
let undoStack = []; // { page, notes } 형태로 저장

// 현재 페이지 노트 반환 (없으면 빈 배열)
function getNotes(page) {
  if (!pageNotes[page]) pageNotes[page] = [];
  return pageNotes[page];
}

// ── 히스토리 저장 (현재 페이지 기준) ──
function saveHistory() {
  const page = window.currentPage;
  undoStack.push({
    page,
    notes: JSON.stringify(getNotes(page)),
  });
}

// ── Undo (현재 페이지 기준) ──
function undo() {
  const page = window.currentPage;
  // 현재 페이지에 해당하는 마지막 히스토리 탐색
  for (let i = undoStack.length - 1; i >= 0; i--) {
    if (undoStack[i].page === page) {
      pageNotes[page] = JSON.parse(undoStack[i].notes);
      undoStack.splice(i, 1);
      renderPage(page);
      return;
    }
  }
  alert('이 페이지에서 되돌릴 내용이 없습니다.');
}

// ── PDF 로드 ──
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const url = URL.createObjectURL(file);
  loadPDF(url);
});

function loadPDF(url) {
  // 새 PDF 로드 시 노트 초기화
  pageNotes = {};
  undoStack = [];
  pdfjsLib.getDocument(url).promise.then((pdf) => {
    window.pdfDoc = pdf;
    window.currentPage = 1;
    renderPage(1);
    if (window.updatePageInfo) window.updatePageInfo();
  });
}

// ── 페이지 렌더링 ──
function renderPage(num) {
  window.pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale: window.currentScale });
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    const renderPromise = renderTask.promise ?? renderTask;
    renderPromise.then(() => {
      drawNotes(ctx, num); // 해당 페이지 노트만 그리기
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
  const el = document.getElementById('zoomLabel');
  if (el) el.textContent = Math.round(window.currentScale * 100) + '%';
  const sel = document.getElementById('zoomSelect');
  if (sel) sel.value = window.currentScale;
}

// ── 노트 드로잉 (지정 페이지 노트만) ──
function drawNotes(ctx, page) {
  getNotes(page).forEach((n) => {
    if (n.type === 'highlight') {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = n.color;
      ctx.fillRect(n.x - 40, n.y - 10, 80, 20);
      ctx.globalAlpha = 1.0;
    }
    if (n.type === 'text') {
      ctx.fillStyle = 'red';
      ctx.font = '16px Arial';
      ctx.fillText(n.text, n.x, n.y);
    }
  });
}

// ── 툴 선택 ──
function setTool(t) {
  tool = t;
}

// ── 캔버스 클릭 ──
document.getElementById('pdfCanvas').addEventListener('click', (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const page = window.currentPage;

  if (tool === 'highlight') {
    saveHistory();
    getNotes(page).push({
      type: 'highlight', x, y,
      color: document.getElementById('highlightColor').value,
    });
    renderPage(page);
  }

  if (tool === 'text') {
    const text = prompt('텍스트 입력:');
    if (text) {
      saveHistory();
      getNotes(page).push({ type: 'text', x, y, text });
      renderPage(page);
    }
  }
});

// ── 단축키: Ctrl+Z / Ctrl+= / Ctrl+- ──
document.addEventListener('keydown', (e) => {
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

// ── 저장 (전체 페이지 노트 저장) ──
function saveToBrowser() {
  localStorage.setItem('pdfNotes', JSON.stringify(pageNotes));
  alert('저장 완료!');
}

// ── 불러오기 (전체 페이지 노트 복원) ──
function importJSON() {
  const json = prompt('JSON 입력:');
  if (json) {
    saveHistory();
    pageNotes = JSON.parse(json);
    renderPage(window.currentPage);
  }
}

// ── 내보내기 (전체 페이지 노트) ──
function exportJSON() {
  alert(JSON.stringify(pageNotes));
}

// ── 현재 페이지 노트만 초기화 ──
function clearNotes() {
  saveHistory();
  pageNotes[window.currentPage] = [];
  renderPage(window.currentPage);
}
