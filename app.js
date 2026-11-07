let questions = [], current = 0, answered = {};
const $ = id => document.getElementById(id);
fetch('questions.json').then(r => r.json()).then(data => { questions = data; buildSelector(); render(); }).catch(() => { $('questionText').textContent = 'Không thể tải questions.json'; });
function buildSelector(){ $('questionSelect').innerHTML = questions.map((q,i)=>`<option value="${i}">Câu ${String(i+1).padStart(3,'0')}</option>`).join(''); }
function render(){
  const q=questions[current]; if(!q)return;
  $('questionSelect').value=current; $('questionNumber').textContent=`CÂU ${String(current+1).padStart(3,'0')}`; $('progressText').textContent=`Câu ${current+1} / ${questions.length}`; $('progressBar').style.width=`${((current+1)/questions.length)*100}%`; $('questionText').textContent=q.question;
  $('multiBadge').classList.toggle('hidden',!q.multi); $('options').innerHTML=q.options.map((o,i)=>`<label class="option" data-index="${i}"><input type="${q.multi?'checkbox':'radio'}" name="answer" value="${o.letter}"><span class="letter">${o.letter}</span><span class="option-text">${o.text}</span></label>`).join('');
  $('result').className='result hidden'; $('explanation').className='explanation hidden'; $('explanationText').textContent='';
  const prior=answered[current]; if(prior){ document.querySelectorAll('input[name=answer]').forEach(input=>{ input.checked=prior.selected.includes(input.value); input.closest('.option').classList.toggle('selected',input.checked); }); showResult(prior.selected, false); }
  document.querySelectorAll('.option').forEach(el=>el.addEventListener('click',()=>el.classList.toggle('selected',el.querySelector('input').checked)));
}
function selected(){return [...document.querySelectorAll('input[name=answer]:checked')].map(x=>x.value)}
function check(){const picks=selected(); if(!picks.length){$('result').className='result bad';$('result').textContent='Hãy chọn ít nhất một đáp án.';return} answered[current]={selected:picks}; showResult(picks,true)}
function showResult(picks,save){const q=questions[current], correct=q.correct; const ok=picks.length===correct.length&&picks.every(x=>correct.includes(x)); document.querySelectorAll('.option').forEach(el=>{const l=el.querySelector('input').value;if(correct.includes(l))el.classList.add('correct');else if(picks.includes(l))el.classList.add('wrong');el.querySelector('input').disabled=true}); $('result').className=`result ${ok?'good':'bad'}`; $('result').textContent=ok?'✓ Chính xác!':`Chưa đúng. Đáp án: ${correct.join(', ')}`; $('explanationText').textContent=q.explanation; $('explanation').className='explanation';}
function go(n){current=Math.max(0,Math.min(questions.length-1,n));render();window.scrollTo({top:0,behavior:'smooth'})}
$('checkBtn').onclick=check;$('resetBtn').onclick=render;$('prevBtn').onclick=()=>go(current-1);$('nextBtn').onclick=()=>go(current+1);$('randomBtn').onclick=()=>go(Math.floor(Math.random()*questions.length));$('questionSelect').onchange=e=>go(+e.target.value);
