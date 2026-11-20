"""Sign locally using password files. Never print or commit signing material."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

parser = argparse.ArgumentParser()
for name in ('keystore', 'store-password-file', 'key-password-file', 'alias-file', 'input', 'output', 'provenance'):
    parser.add_argument('--' + name, required=True)
a = parser.parse_args()
root = Path(__file__).resolve().parent.parent
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=root), 'Commit source changes before signing'
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
version = json.loads((root / 'package.json').read_text())['version']
expected = json.loads((root / 'release-signing.json').read_text())['android_certificate_sha256']
sdk = Path(os.environ['ANDROID_HOME']) / 'build-tools' / '37.0.0'
alias = Path(a.alias_file).read_text().strip()
output = Path(a.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)
os.umask(0o077)
with tempfile.TemporaryDirectory(prefix='prismalink-align-', dir=output.parent) as temporary:
    aligned = Path(temporary) / 'aligned.apk'
    subprocess.run([str(sdk / 'zipalign'), '-P', '16', '-f', '4', a.input, str(aligned)], capture_output=True, check=True)
    signed = subprocess.run([str(sdk / 'apksigner'), 'sign', '--ks', a.keystore, '--ks-key-alias', alias, '--ks-pass', 'file:' + a.store_password_file, '--key-pass', 'file:' + a.key_password_file, '--out', str(output), str(aligned)], capture_output=True)
    if signed.returncode:
        raise SystemExit('Signing failed. No credential values have been printed.')
manifest = {'source_commit': commit, 'version': version, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size, 'android_certificate_sha256': expected, 'private_signing_material_included': False}
Path(a.provenance).write_text(json.dumps(manifest, indent=2) + '\n')
subprocess.run(['python3', str(root / 'scripts/verify-android-artifact.py'), str(output), a.provenance], cwd=root, check=True)
