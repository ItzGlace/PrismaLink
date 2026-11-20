"""Verify a signed universal APK against the release source and pinned owner identity."""
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import sys
import zipfile

apk = Path(sys.argv[1])
provenance = json.loads(Path(sys.argv[2]).read_text())
root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
expected_cert = json.loads((root / 'release-signing.json').read_text())['android_certificate_sha256']
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
assert provenance['source_commit'] == commit, 'APK source commit mismatch'
assert provenance['version'] == version, 'APK source version mismatch'
assert provenance['sha256'] == hashlib.sha256(apk.read_bytes()).hexdigest(), 'APK checksum mismatch'
assert provenance['bytes'] == apk.stat().st_size, 'APK size mismatch'
sdk = Path(os.environ['ANDROID_HOME']) / 'build-tools' / '37.0.0'
verified = subprocess.run([str(sdk / 'apksigner'), 'verify', '--verbose', '--print-certs', str(apk)], capture_output=True, text=True, check=True)
certs = {value.upper() for value in re.findall(r'certificate SHA-256 digest: ([0-9a-fA-F]+)', verified.stdout)}
assert certs == {expected_cert}, 'Signing identity mismatch'
subprocess.run([str(sdk / 'zipalign'), '-c', '-P', '16', '4', str(apk)], capture_output=True, check=True)
badging = subprocess.check_output([str(sdk / 'aapt'), 'dump', 'badging', str(apk)], text=True)
assert "name='com.prismalink.app'" in badging
assert f"versionName='{version}'" in badging
assert "sdkVersion:'24'" in badging
expected = {'arm64-v8a': 183, 'armeabi-v7a': 40, 'x86_64': 62}
with zipfile.ZipFile(apk) as archive:
    assert archive.testzip() is None, 'APK ZIP corruption'
    abis = {n.split('/')[1] for n in archive.namelist() if n.startswith('lib/') and n.endswith('.so')}
    assert abis == set(expected), f'Unexpected ABIs: {abis}'
    for abi, machine in expected.items():
        data = archive.read(f'lib/{abi}/libprismalink_lib.so')
        assert data[:4] == b'\x7fELF' and data[5] == 1
        assert struct.unpack_from('<H', data, 18)[0] == machine
        wide = data[4] == 2
        offset = struct.unpack_from('<Q' if wide else '<I', data, 32 if wide else 28)[0]
        entry, count = struct.unpack_from('<HH', data, 54 if wide else 42)
        for index in range(count):
            start = offset + index * entry
            if struct.unpack_from('<I', data, start)[0] == 1:
                alignment = struct.unpack_from('<Q' if wide else '<I', data, start + (48 if wide else 28))[0]
                assert alignment >= 16384, f'{abi} has incompatible ELF alignment'
print('Verified signature, pinned owner certificate, source commit/version, SHA-256, ZIP integrity, all three ABI machine types and 16 KiB alignment.')
print('Public signing certificate SHA-256:', expected_cert)
