let questions = [];
let deckItems = [];
let activeQuestions = [];
let current = 0;
let answered = {};
let marked = new Set(JSON.parse(localStorage.getItem('ccdv-marked') || '[]'));
let mode = 'flashcard';
let viewFilter = 'all';
let isFlipped = false;

const $ = id => document.getElementById(id);

fetch('questions.json').then(response => response.json()).then(data => {
  questions = data;
  deckItems = questions.map((question, originalIndex) => ({ question, originalIndex }));
  $('allCount').textContent = questions.length;
  applyFilter();
}).catch(() => {
  $('flashQuestion').textContent = 'Không thể tải questions.json';
});

function questionId() { return activeQuestions[current]?.originalIndex; }
function currentQuestion() { return activeQuestions[current]?.question; }
function persistMarks() { localStorage.setItem('ccdv-marked', JSON.stringify([...marked])); }

function applyFilter() {
  activeQuestions = viewFilter === 'marked'
    ? deckItems.filter(item => marked.has(item.originalIndex))
    : [...deckItems];
  current = Math.min(current, Math.max(activeQuestions.length - 1, 0));
  isFlipped = false;
  render();
}

function buildSelector() {
  $('questionSelect').innerHTML = activeQuestions.map((item, index) =>
    `<option value="${index}">Câu ${String(index + 1).padStart(3, '0')}</option>`
  ).join('');
  $('questionSelect').disabled = !activeQuestions.length;
}

function statusFor(item) {
  const result = answered[item.originalIndex];
  if (marked.has(item.originalIndex)) return 'marked';
  if (!result) return '';
  return result.ok ? 'correct' : 'wrong';
}

function buildQuestionList() {
  $('questionList').innerHTML = activeQuestions.map((item, index) => {
    const status = statusFor(item);
    const symbol = status === 'correct' ? '✓' : status === 'wrong' ? '×' : status === 'marked' ? '★' : '';
    return `<button class="question-chip ${status} ${index === current ? 'active' : ''}" data-index="${index}" type="button"><span>${symbol}</span>${String(index + 1).padStart(3, '0')}</button>`;
  }).join('');
  document.querySelectorAll('.question-chip').forEach(button => {
    button.onclick = () => go(Number(button.dataset.index));
  });
}

function render() {
  buildSelector();
  $('filterMarkedCount').textContent = marked.size;
  $('markedCount').textContent = `${marked.size} câu đã đánh dấu`;
  document.querySelectorAll('.filter-btn').forEach(button => button.classList.toggle('active', button.dataset.filter === viewFilter));

  if (!activeQuestions.length) {
    $('flashcardView').classList.add('hidden');
    $('quizView').classList.add('hidden');
    $('emptyState').classList.remove('hidden');
    $('progressText').textContent = '0 câu';
    $('progressBar').style.width = '0%';
    buildQuestionList();
    return;
  }

  $('emptyState').classList.add('hidden');
  $('progressText').textContent = `Câu ${current + 1} / ${activeQuestions.length}`;
  $('progressBar').style.width = `${((current + 1) / activeQuestions.length) * 100}%`;
  $('flashcardView').classList.toggle('hidden', mode !== 'flashcard');
  $('quizView').classList.toggle('hidden', mode !== 'quiz');
  $('flashcardModeBtn').classList.toggle('active', mode === 'flashcard');
  $('quizModeBtn').classList.toggle('active', mode === 'quiz');
  renderFlashcard();
  renderQuiz();
  buildQuestionList();
}

function renderFlashcard() {
  const q = currentQuestion();
  $('flashcard').classList.toggle('is-flipped', isFlipped);
  $('flashcard').setAttribute('aria-pressed', String(isFlipped));
  $('flashQuestion').textContent = q.question;
  $('flashAnswer').textContent = `Đáp án: ${q.correct.join(', ')}`;
  $('flashExplanation').textContent = q.explanation || 'Hãy tự giải thích lại ý chính của câu này.';
  $('flipBtn').textContent = isFlipped ? 'Xem câu hỏi' : 'Lật thẻ';
  const isMarked = marked.has(questionId());
  $('markCardBtn').textContent = isMarked ? '★ Bỏ đánh dấu' : '☆ Đánh dấu câu này';
  $('markCardBtn').classList.toggle('is-marked', isMarked);
}

function renderQuiz() {
  const q = currentQuestion();
  $('questionSelect').value = current;
  $('questionNumber').textContent = `CÂU ${String(current + 1).padStart(3, '0')}`;
  $('questionText').textContent = q.question;
  $('multiBadge').classList.toggle('hidden', !q.multi);
  $('options').innerHTML = q.options.map(option =>
    `<label class="option"><input type="${q.multi ? 'checkbox' : 'radio'}" name="answer" value="${option.letter}"><span class="letter">${option.letter}</span><span class="option-text">${option.text}</span></label>`
  ).join('');
  $('result').className = 'result hidden';
  $('explanation').className = 'explanation hidden';
  $('explanationText').textContent = '';
  const isMarked = marked.has(questionId());
  $('starBtn').textContent = isMarked ? '★' : '☆';
  $('starBtn').classList.toggle('is-marked', isMarked);
  $('starBtn').setAttribute('aria-pressed', String(isMarked));

  const prior = answered[questionId()];
  if (prior) {
    document.querySelectorAll('input[name=answer]').forEach(input => input.checked = prior.selected.includes(input.value));
    showResult(prior.selected, prior.ok);
  }
  document.querySelectorAll('.option input').forEach(input => input.addEventListener('change', () => {
    document.querySelectorAll('.option').forEach(item => item.classList.toggle('selected', item.querySelector('input').checked));
    const picks = selected();
    if (!q.multi || picks.length >= q.correct.length) check(picks);
  }));
}

function selected() { return [...document.querySelectorAll('input[name=answer]:checked')].map(input => input.value); }

function check(picks = selected()) {
  if (!picks.length) return;
  const q = currentQuestion();
  const ok = picks.length === q.correct.length && picks.every(value => q.correct.includes(value));
  answered[questionId()] = { selected: picks, ok };
  showResult(picks, ok);
  buildQuestionList();
}

function showResult(picks, ok) {
  const q = currentQuestion();
  document.querySelectorAll('.option').forEach(option => {
    const input = option.querySelector('input');
    const letter = input.value;
    option.classList.remove('correct', 'wrong');
    if (picks.includes(letter)) option.classList.add(q.correct.includes(letter) ? 'correct' : 'wrong');
    input.disabled = true;
  });
  $('result').className = `result ${ok ? 'good' : 'bad'}`;
  $('result').textContent = ok ? '✓ Chính xác!' : `Chưa đúng. Đáp án: ${q.correct.join(', ')}`;
  $('explanationText').textContent = q.explanation;
  $('explanation').className = 'explanation';
}

function toggleMark() {
  const id = questionId();
  if (id === undefined) return;
  marked.has(id) ? marked.delete(id) : marked.add(id);
  persistMarks();
  render();
}

function resetCurrent() { delete answered[questionId()]; render(); }

function go(index) {
  if (!activeQuestions.length) return;
  current = Math.max(0, Math.min(activeQuestions.length - 1, index));
  isFlipped = false;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function createExam() {
  deckItems = shuffle(questions.map((question, originalIndex) => ({ question, originalIndex }))).slice(0, 60);
  current = 0;
  viewFilter = 'all';
  applyFilter();
}

$('prevBtn').onclick = () => go(current - 1);
$('nextBtn').onclick = () => go(current + 1);
$('randomBtn').onclick = () => activeQuestions.length && go(Math.floor(Math.random() * activeQuestions.length));
$('examBtn').onclick = createExam;
$('resetBtn').onclick = resetCurrent;
$('starBtn').onclick = toggleMark;
$('markCardBtn').onclick = toggleMark;
$('flipBtn').onclick = () => { isFlipped = !isFlipped; renderFlashcard(); };
$('flashcard').onclick = () => { isFlipped = !isFlipped; renderFlashcard(); };
$('flashcardModeBtn').onclick = () => { mode = 'flashcard'; render(); };
$('quizModeBtn').onclick = () => { mode = 'quiz'; render(); };
$('questionSelect').onchange = event => go(Number(event.target.value));
document.querySelectorAll('.filter-btn').forEach(button => button.onclick = () => {
  viewFilter = button.dataset.filter;
  current = 0;
  applyFilter();
});
$('clearMarksBtn').onclick = () => {
  marked.clear();
  persistMarks();
  applyFilter();
};
