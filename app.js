let pdfDoc = null;
let currentPage = 1;
let tool = null;
let notes = [];

// PDF 로드
document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const url = URL.createObjectURL(file);
  loadPDF(url);
});

function loadPDF(url) {
  pdfjsLib.getDocument(url).promise.then((pdf) => {
    pdfDoc = pdf;
    renderPage(1);
  });
}

// 페이지 렌더링
function renderPage(num) {
  pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    page.render({ canvasContext: ctx, viewport });

    renderNotes();
  });
}

// 툴 선택
function setTool(t) {
  tool = t;
}

// 캔버스 클릭 이벤트
document.getElementById('pdfCanvas').addEventListener('click', (e) => {
  const rect = e.target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (tool === 'highlight') {
    notes.push({
      type: 'highlight',
      x,
      y,
      color: document.getElementById('highlightColor').value,
    });
  }

  if (tool === 'text') {
    const text = prompt('텍스트 입력:');
    if (text) {
      notes.push({
        type: 'text',
        x,
        y,
        text,
      });
    }
  }

  renderNotes();
});

// 노트 렌더링
function renderNotes() {
  const canvas = document.getElementById('pdfCanvas');
  const ctx = canvas.getContext('2d');

  renderPage(currentPage);

  notes.forEach((n) => {
    if (n.type === 'highlight') {
      ctx.fillStyle = n.color;
      ctx.fillRect(n.x - 40, n.y - 10, 80, 20);
    }

    if (n.type === 'text') {
      ctx.fillStyle = 'red';
      ctx.font = '16px Arial';
      ctx.fillText(n.text, n.x, n.y);
    }
  });
}

// 저장
function saveToBrowser() {
  localStorage.setItem('pdfNotes', JSON.stringify(notes));
  alert('저장 완료!');
}

// 불러오기
function importJSON() {
  const json = prompt('JSON 입력:');
  if (json) {
    notes = JSON.parse(json);
    renderNotes();
  }
}

// 내보내기
function exportJSON() {
  alert(JSON.stringify(notes));
}

// 초기화
function clearNotes() {
  notes = [];
  renderNotes();
}
