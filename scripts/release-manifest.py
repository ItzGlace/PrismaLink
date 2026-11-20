import hashlib, json, pathlib, subprocess, sys
root=pathlib.Path(sys.argv[1]); commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
files=sorted(p for p in root.iterdir() if p.is_file() and p.name not in ['SHA256SUMS','provenance.json'])
manifest={'commit':commit,'tag':subprocess.check_output(['git','describe','--tags','--exact-match'],text=True).strip(),'assets':[{ 'name':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
(root/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'SHA256SUMS').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in sorted(root.iterdir()) if p.is_file() and p.name!='SHA256SUMS'))
