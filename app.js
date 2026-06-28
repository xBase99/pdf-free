window.pdfDoc = null;
window.currentPage = 1;
window.currentScale = 1.5; // 기본 배율
let tool = null;
let notes = [];
let undoStack = [];

// ── 히스토리 저장 ──
function saveHistory() {
  undoStack.push(JSON.stringify(notes));
}

// ── Undo ──
function undo() {
  if (undoStack.length === 0) {
    alert('더 이상 되돌릴 내용이 없습니다.');
    return;
  }
  notes = JSON.parse(undoStack.pop());
  renderPage(window.currentPage);
}

// ── PDF 로드 ──
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const url = URL.createObjectURL(file);
  loadPDF(url);
});

function loadPDF(url) {
  pdfjsLib.getDocument(url).promise.then((pdf) => {
    window.pdfDoc = pdf;
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
      drawNotes(ctx);
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

// ── 노트 드로잉 ──
function drawNotes(ctx) {
  notes.forEach((n) => {
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

  if (tool === 'highlight') {
    saveHistory();
    notes.push({
      type: 'highlight',
      x, y,
      color: document.getElementById('highlightColor').value,
    });
    renderPage(window.currentPage);
  }

  if (tool === 'text') {
    const text = prompt('텍스트 입력:');
    if (text) {
      saveHistory();
      notes.push({ type: 'text', x, y, text });
      renderPage(window.currentPage);
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

// ── 저장 ──
function saveToBrowser() {
  localStorage.setItem('pdfNotes', JSON.stringify(notes));
  alert('저장 완료!');
}

// ── 불러오기 ──
function importJSON() {
  const json = prompt('JSON 입력:');
  if (json) {
    saveHistory();
    notes = JSON.parse(json);
    renderPage(window.currentPage);
  }
}

// ── 내보내기 ──
function exportJSON() {
  alert(JSON.stringify(notes));
}

// ── 초기화 ──
function clearNotes() {
  saveHistory();
  notes = [];
  renderPage(window.currentPage);
}
