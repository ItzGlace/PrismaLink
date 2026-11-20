"""Require successful native jobs from the exact release source before reusing artifacts."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

manifest = json.loads(Path(sys.argv[1]).read_text())
run_id = int(manifest['native_run_id'])
assert run_id > 0
repo = os.environ['GITHUB_REPOSITORY']
commit = subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert manifest['source_commit'] == commit

def api(path):
    return json.loads(subprocess.check_output(['gh','api',path],text=True))

run = api(f'repos/{repo}/actions/runs/{run_id}')
assert run['head_sha'] == commit, 'Native artifacts were built from another commit'
assert run['path'].split('@')[0] == '.github/workflows/release.yml', 'Wrong native workflow'
required = {'checks','desktop (ubuntu-24.04, deb,rpm,appimage)','desktop (windows-2022, nsis)'}
for _ in range(90):
    jobs = api(f'repos/{repo}/actions/runs/{run_id}/jobs?filter=latest&per_page=100')['jobs']
    selected = {job['name']:job for job in jobs if job['name'] in required}
    for name,job in selected.items():
        if job['conclusion'] in ('failure','cancelled','timed_out','action_required','skipped'):
            raise SystemExit(f'Required native job did not pass: {name}')
    if set(selected) == required and all(job['conclusion']=='success' for job in selected.values()):
        Path(sys.argv[2]).write_text(json.dumps({'run_id':run_id,'source_commit':commit,'jobs':{name:job['conclusion'] for name,job in selected.items()}},indent=2)+'\n')
        with open(os.environ['GITHUB_OUTPUT'],'a') as output:output.write(f'run_id={run_id}\n')
        print('Confirmed checks and both native desktop install/render/uninstall jobs passed for the release commit.')
        break
    print('Waiting for required native checks and desktop jobs.',flush=True)
    time.sleep(20)
else:
    raise SystemExit('Native verification did not complete within 30 minutes')
