const fs=require('fs');
const source=fs.readFileSync('C:/Users/Admin/.codex/attachments/e9e4b7d8-a980-440d-a963-e7cbef3c0fce/Pasted text.txt','utf8').replace(/\r/g,'');
const blocks=source.split(/(?=CÂU \d{3} \/ 155)/).filter(x=>/^CÂU \d{3} \/ 155/.test(x));
const out=blocks.map(block=>{
  const lines=block.split('\n').map(x=>x.trim()).filter(Boolean), head=lines[0];
  const oi=lines.indexOf('CÁC LỰA CHỌN'), ai=lines.findIndex(x=>x.startsWith('ĐÁP ÁN ĐÚNG:')), ei=lines.indexOf('GIẢI THÍCH TỪ NGUỒN');
  const options=lines.slice(oi+1,ai).filter(x=>/^[A-F]\.\s/.test(x)).map(x=>({letter:x[0],text:x.slice(3).trim()}));
  const answer=lines[ai].replace('ĐÁP ÁN ĐÚNG: ',''); const first=answer.match(/^([A-F](?:,\s*[A-F])*)/); let correct=first?first[1].split(/,\s*/):[];
  const explanation=lines.slice(ei+1).filter(x=>!x.startsWith('Tham khảo:')).join('\n').replace(/^Nội dung đáp án theo khóa nguồn:\s*/,'');
  const question=lines.slice(1,oi).join('\n');
  const multi=/Select all|chọn tất cả|nhiều đáp án/i.test(question+' '+answer+' '+explanation);
  if(multi){const found=[...explanation.matchAll(/(?:;|^)(?:.*?)\b([A-F])\.?\s*[—-]/g)].map(m=>m[1]); if(found.length>1)correct=[...new Set(found)]}
  return {number:head.match(/\d+/)[0],question,options,correct, multi, explanation};
});
fs.writeFileSync('questions.json',JSON.stringify(out,null,2),'utf8');
console.log(`Built ${out.length} questions`);
