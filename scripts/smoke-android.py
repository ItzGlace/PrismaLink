"""Fresh emulator only: actual vault create/restart/unlock through Android UI automation."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET
import sys
from pathlib import Path

def report_failure(kind, value, traceback):
    message = str(value).replace('%','%25').replace('\r','%0D').replace('\n','%0A')
    print('::error::Android emulator verification failed: ' + message, flush=True)
    try:
        Path('release').mkdir(exist_ok=True)
        screenshot = subprocess.check_output(['adb','exec-out','screencap','-p'])
        Path('release/android-failure.png').write_bytes(screenshot)
        subprocess.run(['adb','pull','/sdcard/prismalink-ui.xml','release/android-failure.xml'], capture_output=True)
    except Exception:
        pass
    sys.__excepthook__(kind, value, traceback)

sys.excepthook = report_failure

PASSWORD = 'prismalink-ci-disposable-2026'
COMPONENT = 'com.prismalink.app/.MainActivity'


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True)


def tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/prismalink-ui.xml')
    return ET.fromstring(adb('shell', 'cat', '/sdcard/prismalink-ui.xml'))


def visible(node):
    values = list(map(int, re.findall(r'-?\d+', node.get('bounds',''))))
    if len(values) != 4:
        return False
    x1,y1,x2,y2 = values
    if x1 < 0 or y1 < 0 or x2 <= x1 or y2 <= y1:
        return False
    return node.get('clickable') != 'true' or y2-y1 >= 24


def wait_for(text, scroll=False):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        root = tree()
        for node in root.iter('node'):
            if visible(node) and (text in node.get('text', '') or text in node.get('content-desc', '')):
                return node
        if scroll:
            size = adb('shell','wm','size')
            width,height = map(int,re.findall(r'(\d+)x(\d+)',size)[-1])
            adb('shell','input','swipe',str(width//2),str(height*4//5),str(width//2),str(height//3),'350')
        time.sleep(1)
    raise RuntimeError(f'Native Android UI did not expose: {text}')


def tap(node):
    assert visible(node), 'Refusing to tap an offscreen Android control'
    x1,y1,x2,y2 = map(int, re.findall(r'\d+', node.attrib['bounds']))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))


def type_passwords(expected_fields):
    fields=[]
    for _ in range(6):
        fields=[n for n in tree().iter('node') if n.get('password')=='true' and visible(n)]
        if fields:
            break
        size=adb('shell','wm','size')
        width,height=map(int,re.findall(r'(\d+)x(\d+)',size)[-1])
        adb('shell','input','swipe',str(width//2),str(height*4//5),str(width//2),str(height//3),'350')
    assert fields, 'No accessible password field'
    tap(fields[0])
    adb('shell','input','text',PASSWORD)
    if expected_fields==2:
        adb('shell','input','keyevent','61')
        adb('shell','input','text',PASSWORD)
    adb('shell','input','keyevent','4')  # Dismiss keyboard before finding the submit button.


adb('shell','am','start','-W','-n',COMPONENT)
wait_for('Make yourself at home.')
type_passwords(2)
tap(wait_for('Create my vault', scroll=True))
wait_for('A place for every host.')
adb('shell','am','force-stop','com.prismalink.app')
adb('shell','am','start','-W','-n',COMPONENT)
wait_for('Welcome back.')
type_passwords(1)
tap(wait_for('Unlock workspace', scroll=True))
wait_for('A place for every host.')
print('Android native WebView vault create/persist/restart/unlock passed.')
