import json, re
src = open(r'C:\Users\Admin\.codex\attachments\e9e4b7d8-a980-440d-a963-e7cbef3c0fce\Pasted text.txt', encoding='utf-8').read().replace('\r','')
blocks = [x for x in re.split(r'(?=CÂU \d{3} / 155)', src) if re.match(r'^CÂU \d{3} / 155', x)]
out=[]
for block in blocks:
    lines=[x.strip() for x in block.split('\n') if x.strip()]
    oi=lines.index('CÁC LỰA CHỌN'); ai=next(i for i,x in enumerate(lines) if x.startswith('ĐÁP ÁN ĐÚNG:')); ei=lines.index('GIẢI THÍCH TỪ NGUỒN')
    options=[{'letter':x[0], 'text':x[3:].strip()} for x in lines[oi+1:ai] if re.match(r'^[A-F]\.\s',x)]
    answer=lines[ai].replace('ĐÁP ÁN ĐÚNG: ',''); m=re.match(r'^([A-F](?:,\s*[A-F])*)', answer); correct=m.group(1).split(', ') if m else []
    explanation='\n'.join(lines[ei+1:]).replace('Nội dung đáp án theo khóa nguồn: ','',1)
    question='\n'.join(lines[1:oi])
    multi=bool(re.search(r'Select all|chọn tất cả|nhiều đáp án', question+' '+answer+' '+explanation, re.I))
    if multi:
        found=re.findall(r'(?:^|;)\s*.*?\b([A-F])\.?(?=\s*[—-])', explanation)
        if len(found)>1: correct=list(dict.fromkeys(found))
    out.append({'number':re.search(r'\d+',lines[0]).group(), 'question':question, 'options':options, 'correct':correct, 'multi':multi, 'explanation':explanation})
open('questions.json','w',encoding='utf-8').write(json.dumps(out,ensure_ascii=False,indent=2))
print(f'Built {len(out)} questions')
