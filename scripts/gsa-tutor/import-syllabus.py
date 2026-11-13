"""Import the owner-supplied FPSC extract; never imply a successful online retrieval."""
import argparse, hashlib, json, pathlib, re, subprocess
p=argparse.ArgumentParser();p.add_argument('pdf');a=p.parse_args()
pdf=pathlib.Path(a.pdf)
raw=subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
part=raw.split('Part-I (General Science)',1)[1].split('Part-II (General Ability)',1)[0]
domains=[];current=None
for line in part.splitlines():
 line=line.strip()
 heading=re.fullmatch(r'(I{1,3}|IV|V)\.\s+(.+)',line)
 if heading:
  current={'title':heading[1]+'. '+heading[2],'items':[]};domains.append(current);continue
 if not current or not line or line.isdigit() or 'Revised Scheme and Syllabus' in line:continue
 if line.startswith(''):current['items'].append(line[1:].strip())
 elif current['items']:current['items'][-1]+=' '+line
assert len(domains)==5
assert [len(d['items']) for d in domains]==[6,6,6,3,2]
assert '60 Marks' in part
manifest={'title':'General Science & Ability — Revised Scheme and Syllabus for CSS Competitive Examination','publisher':'Federal Public Service Commission','origin':'User-supplied PDF, inspected directly','originalFilename':pdf.name,'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'receivedOn':'2026-11-12','printedPages':[7,8,9],'scope':'Part I General Science, 60 marks; Part II excluded','onlineCurrentVersion':'unconfirmed; FPSC endpoints returned HTTP 503','status':'compared-with-provided-FPSC-document','domains':domains}
root=pathlib.Path('docs/gsa-tutor/sources')
(root/'provided-fpsc-syllabus.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(root/'provided-fpsc-syllabus.txt').write_text(raw)
print('Imported 23 official bullets across five domains; drinking-water standards is a separate traceability subtopic, making 24 register rows.')
