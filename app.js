let questions = [];
let deckItems = [];
let activeQuestions = [];
let current = 0;
let answered = {};
let marked = new Set(JSON.parse(localStorage.getItem('ccdv-marked') || '[]'));
let mode = 'flashcard';
let viewFilter = 'all';
let isFlipped = false;
let examState = null;

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
  if (examState?.active) {
    if (!examState.submitted) return marked.has(item.originalIndex) ? 'marked' : '';
    const result = examState.results[item.originalIndex];
    if (result) return result.ok ? 'correct' : 'wrong';
    return marked.has(item.originalIndex) ? 'marked' : '';
  }
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
  if (examState?.active && !examState.submitted) {
    $('progressText').textContent = `Câu ${current + 1} / ${activeQuestions.length} · Đã chọn ${examAnsweredCount()} / ${activeQuestions.length}`;
  }
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
  const density = q.question.length > 700 ? 'compact' : q.question.length > 420 ? 'dense' : 'normal';
  $('flashcard').dataset.density = density;
  $('flashQuestionNumber').textContent = `CÂU ${String(current + 1).padStart(3, '0')}`;
  $('flashQuestion').textContent = q.question;
  $('flashOptions').innerHTML = q.options.map(option => `
    <span class="flash-option">
      <span class="flash-option-dot"></span>
      <span class="flash-option-letter">${option.letter}</span>
      <span class="flash-option-text">${option.text}</span>
    </span>
  `).join('');
  $('flashAnswer').textContent = q.correct.length > 1 ? 'Các đáp án đúng' : 'Đáp án đúng';
  $('flashAnswerText').textContent = q.options
    .filter(option => q.correct.includes(option.letter))
    .map(option => `${option.letter}. ${option.text}`)
    .join('\n');
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
  renderExamSummary();
  const isMarked = marked.has(questionId());
  $('starBtn').textContent = isMarked ? '★' : '☆';
  $('starBtn').classList.toggle('is-marked', isMarked);
  $('starBtn').setAttribute('aria-pressed', String(isMarked));

  const id = questionId();
  const prior = examState?.active ? examState.selections[id] : answered[id];
  const submittedResult = examState?.active && examState.submitted ? examState.results[id] : null;
  $('checkBtn').classList.toggle('hidden', examState?.active || !q.multi || Boolean(prior));
  if (prior || submittedResult) {
    const picks = prior?.selected || submittedResult?.selected || [];
    document.querySelectorAll('input[name=answer]').forEach(input => input.checked = picks.includes(input.value));
    if (!examState?.active || examState.submitted) {
      const ok = examState?.active ? submittedResult?.ok : prior.ok;
      showResult(picks, ok);
    }
  }
  document.querySelectorAll('.option input').forEach(input => input.addEventListener('change', () => {
    document.querySelectorAll('.option').forEach(item => item.classList.toggle('selected', item.querySelector('input').checked));
    const picks = selected();
    if (examState?.active) {
      const questionIndex = current;
      const id = questionId();
      examState.selections[id] = { selected: picks };
      updateExamStatus();
      if (!q.multi && questionIndex < activeQuestions.length - 1) {
        window.setTimeout(() => {
          if (examState?.active && !examState.submitted && current === questionIndex) {
            go(questionIndex + 1);
          }
        }, 0);
      }
    } else if (!q.multi) {
      check(picks);
    }
  }));
}

function selected() { return [...document.querySelectorAll('input[name=answer]:checked')].map(input => input.value); }

function check(picks = selected()) {
  if (!picks.length) return;
  const q = currentQuestion();
  const ok = picks.length === q.correct.length && picks.every(value => q.correct.includes(value));
  answered[questionId()] = { selected: picks, ok };
  $('checkBtn').classList.add('hidden');
  showResult(picks, ok);
  buildQuestionList();
}

function examAnsweredCount() {
  if (!examState?.active) return 0;
  return activeQuestions.filter(item => (examState.selections[item.originalIndex]?.selected || []).length > 0).length;
}

function updateExamStatus() {
  if (!examState?.active || examState.submitted) return;
  const count = examAnsweredCount();
  $('examStatus').textContent = count === activeQuestions.length
    ? 'Đã trả lời đủ. Bấm Nộp bài để xem kết quả.'
    : `Còn ${activeQuestions.length - count} câu chưa trả lời.`;
  $('examStatus').className = 'exam-status';
  $('submitExamBtn').disabled = false;
  render();
}

function renderExamSummary() {
  const summary = $('examSummary');
  $('resetBtn').classList.toggle('hidden', Boolean(examState?.active && examState.submitted));
  if (!examState?.active || !examState.submitted) {
    summary.className = 'exam-summary hidden';
    $('examStatus').className = examState?.active ? 'exam-status' : 'exam-status hidden';
    $('submitExamBtn').classList.toggle('hidden', !examState?.active);
    if (examState?.active) {
      const count = examAnsweredCount();
      $('examStatus').textContent = count === activeQuestions.length
        ? 'Đã trả lời đủ. Bấm Nộp bài để xem kết quả.'
        : `Còn ${activeQuestions.length - count} câu chưa trả lời.`;
      $('submitExamBtn').disabled = false;
    }
    return;
  }

  const correct = Object.values(examState.results).filter(result => result.ok).length;
  const wrong = activeQuestions.length - correct;
  $('examCorrect').textContent = correct;
  $('examWrong').textContent = wrong;
  $('retryWrongBtn').classList.toggle('hidden', wrong === 0);
  $('retryWrongBtn').textContent = `Làm lại ${wrong} câu sai`;
  summary.className = 'exam-summary';
  $('examStatus').className = 'exam-status hidden';
  $('submitExamBtn').classList.add('hidden');
}

function submitExam() {
  if (!examState?.active || examState.submitted) return;
  examState.results = {};
  activeQuestions.forEach(item => {
    const q = item.question;
    const picks = examState.selections[item.originalIndex]?.selected || [];
    const ok = picks.length === q.correct.length && picks.every(value => q.correct.includes(value));
    examState.results[item.originalIndex] = { selected: picks, ok };
  });
  examState.submitted = true;
  render();
}

function retryWrong() {
  if (!examState?.submitted) return;
  const wrongItems = activeQuestions.filter(item => !examState.results[item.originalIndex]?.ok);
  if (!wrongItems.length) return;
  deckItems = wrongItems;
  current = 0;
  viewFilter = 'all';
  examState = { active: true, submitted: false, selections: {}, results: {} };
  applyFilter();
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

function resetCurrent() {
  const id = questionId();
  if (examState?.active && !examState.submitted) {
    delete examState.selections[id];
    render();
    return;
  }
  delete answered[id];
  render();
}

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
  mode = 'quiz';
  examState = { active: true, submitted: false, selections: {}, results: {} };
  applyFilter();
}

$('prevBtn').onclick = () => go(current - 1);
$('nextBtn').onclick = () => go(current + 1);
$('randomBtn').onclick = () => activeQuestions.length && go(Math.floor(Math.random() * activeQuestions.length));
$('examBtn').onclick = createExam;
$('submitExamBtn').onclick = submitExam;
$('retryWrongBtn').onclick = retryWrong;
$('checkBtn').onclick = () => check();
$('resetBtn').onclick = resetCurrent;
$('starBtn').onclick = toggleMark;
$('markCardBtn').onclick = toggleMark;
$('flipBtn').onclick = () => { isFlipped = !isFlipped; renderFlashcard(); };
$('flashcard').onclick = () => { isFlipped = !isFlipped; renderFlashcard(); };
$('flashcardModeBtn').onclick = () => { mode = 'flashcard'; render(); };
$('quizModeBtn').onclick = () => { mode = 'quiz'; render(); };
$('questionSelect').onchange = event => go(Number(event.target.value));
document.querySelectorAll('.filter-btn').forEach(button => button.onclick = () => {
  if (examState?.active) return;
  viewFilter = button.dataset.filter;
  current = 0;
  applyFilter();
});
$('clearMarksBtn').onclick = () => {
  marked.clear();
  persistMarks();
  applyFilter();
};

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const activeTag = document.activeElement?.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    go(current - 1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    go(current + 1);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (activeQuestions.length) {
      isFlipped = !isFlipped;
      renderFlashcard();
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    toggleMark();
  }
});
