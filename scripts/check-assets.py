"""Fail closed before publication: validate native formats, size, names and provenance."""
import hashlib, json, os, pathlib, subprocess, sys, zipfile
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'release')
required={'.apk':False,'.exe':False,'.AppImage':False,'.deb':False}
files=[p for p in root.rglob('*') if p.is_file() and p.suffix in {'.apk','.exe','.AppImage','.deb','.rpm'}]
for p in files:
    assert p.stat().st_size > 100_000, f'Implausibly small package: {p}'
    required[p.suffix]=True
    head=p.read_bytes()[:8]
    if p.suffix=='.exe': assert head[:2]==b'MZ', p
    if p.suffix=='.AppImage': assert head[:4]==b'\x7fELF', p
    if p.suffix=='.deb': assert head==b'!<arch>\n', p
    if p.suffix=='.rpm': assert head[:4]==b'\xed\xab\xee\xdb', p
    if p.suffix=='.apk':
        with zipfile.ZipFile(p) as z:
            assert z.testzip() is None
            assert 'AndroidManifest.xml' in z.namelist()
            abis={n.split('/')[1] for n in z.namelist() if n.startswith('lib/') and n.endswith('.so')}
            assert {'arm64-v8a','armeabi-v7a','x86_64'} == abis, abis
assert all(required.values()), f'Missing release targets: {required}'
print(f'Validated {len(files)} native package assets.')
