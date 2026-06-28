// 6개월 제한
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
  return days > 180; // 6개월
}

if (isExpired()) {
  alert('무료 사용기간(6개월)이 만료되었습니다. 유료 버전을 이용해주세요.');
}

// 무료 기능: 주석 추가/삭제/이동/Undo
let annotations = [];
let history = [];

function saveState() {
  history.push(JSON.stringify(annotations));
}

function undo() {
  if (history.length > 0) {
    annotations = JSON.parse(history.pop());
    renderAnnotations();
  }
}

function deleteAnnotation(id) {
  annotations = annotations.filter((a) => a.id !== id);
  renderAnnotations();
}
