// 6개월 사용기간 관리
const installKey = 'installDate';
let installDate = localStorage.getItem(installKey);

if (!installDate) {
  installDate = new Date().toISOString();
  localStorage.setItem(installKey, installDate);
}

function isExpired() {
  const install = new Date(localStorage.getItem('installDate'));
  const now = new Date();
  const diff = now - install;
  const days = diff / (1000 * 60 * 60 * 24);
  return days > 180;
}

const statusText = document.getElementById('statusText');

if (isExpired()) {
  alert('무료 사용기간(6개월)이 만료되었습니다.');
  statusText.textContent = '기간 만료 - 읽기 전용';
} else {
  statusText.textContent = '무료 버전 - 기능 제한 없음 (6개월)';
}

// 주석 데모
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

let annotations = [];
let history = [];

function renderAnnotations() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#333';
  ctx.fillText('PDF Annotator Free (데모 캔버스)', 20, 30);

  ctx.fillStyle = 'red';
  annotations.forEach((a) => {
    ctx.beginPath();
    ctx.arc(a.x, a.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function saveState() {
  history.push(JSON.stringify(annotations));
}

function addDummyAnnotation() {
  if (isExpired()) return;
  saveState();
  const x = 100 + Math.random() * 600;
  const y = 80 + Math.random() * 480;
  annotations.push({ id: Date.now(), x, y });
  renderAnnotations();
}

function undo() {
  if (history.length === 0) return;
  annotations = JSON.parse(history.pop());
  renderAnnotations();
}

function deleteLast() {
  if (isExpired()) return;
  if (annotations.length === 0) return;
  saveState();
  annotations.pop();
  renderAnnotations();
}

renderAnnotations();
