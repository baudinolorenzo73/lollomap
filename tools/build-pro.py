"""Aggiorna gli elenchi PWA senza toccare archivi personali."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
assets=[]
for p in sorted(root.rglob('*')):
    if not p.is_file():continue
    rel=p.relative_to(root).as_posix()
    if any(x in {'tools','node_modules','.git'} for x in p.relative_to(root).parts):continue
    if rel.endswith('.md') or rel.startswith('.') or rel=='sw.js':continue
    assets.append(rel)
p=root/'sw.js';s=p.read_text();s=re.sub(r'const FILE = \[[\s\S]*?\];','const FILE = '+json.dumps(assets,indent=2)+';',s,count=1);p.write_text(s)
print('PWA LolloMap Pro:',len(assets),'file locali')
