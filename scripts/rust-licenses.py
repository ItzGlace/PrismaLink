"""Collect original license/notice texts from the exact Cargo.lock dependency sources."""
import json
from pathlib import Path
import subprocess
import sys

output = Path(sys.argv[1] if len(sys.argv) > 1 else 'licenses/rust')
output.mkdir(parents=True, exist_ok=True)
metadata = json.loads(subprocess.check_output(['cargo', 'metadata', '--locked', '--format-version', '1']))
packages = []
for package in metadata['packages']:
    if package['id'] in metadata['workspace_members']:
        continue
    root = Path(package['manifest_path']).parent
    notices = [p for p in root.iterdir() if p.is_file() and p.name.lower().startswith(('license','licence','notice','copying','copyright'))]
    destination = output / (package['name'] + '-' + package['version'])
    destination.mkdir(exist_ok=True)
    for notice in notices:
        (destination / notice.name).write_bytes(notice.read_bytes())
    for directory in ('licenses','LICENSES'):
        if (root / directory).is_dir():
            for notice in (root / directory).rglob('*'):
                if notice.is_file():
                    target = destination / directory / notice.relative_to(root / directory)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(notice.read_bytes())
    packages.append({'name':package['name'],'version':package['version'],'license':package['license'],'repository':package['repository'],'notice_files':len(list(destination.rglob('*')))})
(output / 'dependencies.json').write_text(json.dumps(packages, indent=2)+'\n')
print(f'Retained notices for {len(packages)} exact locked Rust dependency packages.')
