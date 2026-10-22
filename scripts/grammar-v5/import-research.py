"""Import newly completed research dossiers without replacing editor-owned files."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
for day in range(1,31):
 source=pathlib.Path(f'/tmp/grammar-v5-day-{day:02}.json');target=root/f'content/grammar/v5/day-{day:02}.json'
 if source.exists() and not target.exists():
  data=json.loads(source.read_text());assert data['day']==day
  target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print('Imported',day)
