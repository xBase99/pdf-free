window.pdfDoc = null;
window.currentPage = 1;
window.currentScale = 1.5;
let tool = null;
let pageNotes = {};
let undoStack = [];
let pendingTextPos = null; // 텍스트 모달 대기 좌표

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
  alert('이 페이지에서 되돌릴 내용이 없습니다.');
}

// ── PDF 로드 ──
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const url = URL.createObjectURL(file);
  loadPDF(url);
});

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
    renderPromise.then(() => drawNotes(ctx, num));
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

// ── 노트 드로잉 ──
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
function setTool(t) { tool = t; }

// ── 캔버스 이벤트 좌표 추출 (클릭 & 터치 공통) ──
function getCanvasPos(e) {
  const canvas = document.getElementById('pdfCanvas');
  const rect = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {
    x: src.clientX - rect.left,
    y: src.clientY - rect.top,
  };
}

// ── 캔버스 상호작용 처리 ──
function handleCanvasInteraction(pos) {
  const page = window.currentPage;
  if (tool === 'highlight') {
    saveHistory();
    getNotes(page).push({
      type: 'highlight', x: pos.x, y: pos.y,
      color: document.getElementById('highlightColor').value,
    });
    renderPage(page);
  }
  if (tool === 'text') {
    pendingTextPos = pos;
    openTextModal();
  }
}

// 클릭 이벤트
document.getElementById('pdfCanvas').addEventListener('click', (e) => {
  handleCanvasInteraction(getCanvasPos(e));
});

// 터치 이벤트 (모바일)
document.getElementById('pdfCanvas').addEventListener('touchend', (e) => {
  e.preventDefault(); // 더블탭 줌 방지
  handleCanvasInteraction(getCanvasPos(e.changedTouches[0]
    ? { touches: [e.changedTouches[0]] }
    : e));
}, { passive: false });

// ── 텍스트 모달 (prompt 대체) ──
function openTextModal() {
  const modal = document.getElementById('textModal');
  const input = document.getElementById('textInput');
  input.value = '';
  modal.classList.add('active');
  setTimeout(() => input.focus(), 100);
}

function closeTextModal() {
  document.getElementById('textModal').classList.remove('active');
  pendingTextPos = null;
}

function confirmTextModal() {
  const text = document.getElementById('textInput').value.trim();
  closeTextModal();
  if (text && pendingTextPos) {
    const page = window.currentPage;
    saveHistory();
    getNotes(page).push({ type: 'text', x: pendingTextPos.x, y: pendingTextPos.y, text });
    renderPage(page);
  }
  pendingTextPos = null;
}

// 모달에서 Enter 키 확인
document.getElementById('textInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmTextModal();
  if (e.key === 'Escape') closeTextModal();
});

// ── 단축키 ──
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomIn(); }
  if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); zoomOut(); }
});

// ── 저장 ──
function saveToBrowser() {
  localStorage.setItem('pdfNotes', JSON.stringify(pageNotes));
  alert('저장 완료!');
}

// ── 불러오기 ──
function importJSON() {
  const json = prompt('JSON 입력:');
  if (json) {
    saveHistory();
    pageNotes = JSON.parse(json);
    renderPage(window.currentPage);
  }
}

// ── 내보내기 ──
function exportJSON() {
  alert(JSON.stringify(pageNotes));
}

// ── 현재 페이지 초기화 ──
function clearNotes() {
  saveHistory();
  pageNotes[window.currentPage] = [];
  renderPage(window.currentPage);
}
