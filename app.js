let questions = [], activeQuestions = [], current = 0, answered = {}, marked = new Set();
const $ = id => document.getElementById(id);

fetch('questions.json').then(r => r.json()).then(data => {
  questions = data;
  activeQuestions = questions.map((question, index) => ({ question, originalIndex: index }));
  render();
}).catch(() => { $('questionText').textContent = 'Không thể tải questions.json'; });

function questionId(){ return activeQuestions[current]?.originalIndex; }
function currentQuestion(){ return activeQuestions[current]?.question; }
function buildSelector(){ $('questionSelect').innerHTML = activeQuestions.map((item,i)=>`<option value="${i}">Câu ${String(i+1).padStart(3,'0')}</option>`).join(''); }
function statusFor(item){ const result=answered[item.originalIndex]; if(marked.has(item.originalIndex)) return 'marked'; if(!result) return ''; return result.ok?'correct':'wrong'; }
function buildQuestionList(){
  $('questionList').innerHTML = activeQuestions.map((item,i)=>{ const status=statusFor(item); const symbol=status==='correct'?'✓':status==='wrong'?'×':status==='marked'?'o':''; return `<button class="question-chip ${status} ${i===current?'active':''}" data-index="${i}" type="button"><span>${symbol}</span>${String(i+1).padStart(3,'0')}</button>`; }).join('');
  document.querySelectorAll('.question-chip').forEach(button=>button.onclick=()=>go(Number(button.dataset.index)));
}
function render(){
  const q=currentQuestion(); if(!q)return;
  buildSelector(); $('questionSelect').value=current; $('questionNumber').textContent=`CÂU ${String(current+1).padStart(3,'0')}`; $('progressText').textContent=`Câu ${current+1} / ${activeQuestions.length}`; $('progressBar').style.width=`${((current+1)/activeQuestions.length)*100}%`; $('questionText').textContent=q.question; $('multiBadge').classList.toggle('hidden',!q.multi);
  $('options').innerHTML=q.options.map(o=>`<label class="option"><input type="${q.multi?'checkbox':'radio'}" name="answer" value="${o.letter}"><span class="letter">${o.letter}</span><span class="option-text">${o.text}</span></label>`).join('');
  $('result').className='result hidden'; $('explanation').className='explanation hidden'; $('explanationText').textContent='';
  $('starBtn').textContent=marked.has(questionId())?'★':'☆'; $('starBtn').classList.toggle('is-marked',marked.has(questionId())); $('starBtn').setAttribute('aria-pressed',String(marked.has(questionId())));
  const prior=answered[questionId()];
  if(prior){ document.querySelectorAll('input[name=answer]').forEach(input=>input.checked=prior.selected.includes(input.value)); showResult(prior.selected,prior.ok); }
  document.querySelectorAll('.option input').forEach(input=>input.addEventListener('change',()=>{
    document.querySelectorAll('.option').forEach(item=>item.classList.toggle('selected',item.querySelector('input').checked));
    const picks=selected(); if(!q.multi||picks.length>=q.correct.length) check(picks);
  }));
  buildQuestionList();
}
function selected(){ return [...document.querySelectorAll('input[name=answer]:checked')].map(input=>input.value); }
function check(picks=selected()){
  if(!picks.length)return; const q=currentQuestion(); const ok=picks.length===q.correct.length&&picks.every(value=>q.correct.includes(value)); answered[questionId()]={selected:picks,ok}; showResult(picks,ok); buildQuestionList();
}
function showResult(picks,ok){
  const q=currentQuestion(); document.querySelectorAll('.option').forEach(option=>{ const input=option.querySelector('input'), letter=input.value; option.classList.remove('correct','wrong'); if(picks.includes(letter))option.classList.add(q.correct.includes(letter)?'correct':'wrong'); input.disabled=true; });
  $('result').className=`result ${ok?'good':'bad'}`; $('result').textContent=ok?'✓ Chính xác!':`Chưa đúng. Đáp án: ${q.correct.join(', ')}`; $('explanationText').textContent=q.explanation; $('explanation').className='explanation';
}
function resetCurrent(){ delete answered[questionId()]; render(); }
function go(index){ current=Math.max(0,Math.min(activeQuestions.length-1,index)); render(); window.scrollTo({top:0,behavior:'smooth'}); }
function shuffle(items){ const copy=[...items]; for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];} return copy; }
function createExam(){ activeQuestions=shuffle(questions.map((question,index)=>({question,originalIndex:index}))).slice(0,60); current=0; render(); }

$('prevBtn').onclick=()=>go(current-1); $('nextBtn').onclick=()=>go(current+1); $('randomBtn').onclick=()=>go(Math.floor(Math.random()*activeQuestions.length)); $('examBtn').onclick=createExam; $('resetBtn').onclick=resetCurrent;
$('starBtn').onclick=()=>{const id=questionId(); marked.has(id)?marked.delete(id):marked.add(id); render();}; $('questionSelect').onchange=event=>go(Number(event.target.value));
