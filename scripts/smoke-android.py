"""Fresh emulator only: actual vault create/restart/unlock through Android UI automation."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET

PASSWORD = 'prismalink-ci-disposable-2026'
COMPONENT = 'com.prismalink.app/.MainActivity'


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True)


def tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/prismalink-ui.xml')
    return ET.fromstring(adb('shell', 'cat', '/sdcard/prismalink-ui.xml'))


def wait_for(text):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        root = tree()
        for node in root.iter('node'):
            if text in node.get('text', '') or text in node.get('content-desc', ''):
                return node
        time.sleep(1)
    raise RuntimeError(f'Native Android UI did not expose: {text}')


def tap(node):
    x1,y1,x2,y2 = map(int, re.findall(r'\d+', node.attrib['bounds']))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))


def type_passwords():
    fields=[n for n in tree().iter('node') if n.get('password')=='true']
    assert fields, 'No accessible password field'
    tap(fields[0])
    adb('shell','input','text',PASSWORD)
    if len(fields)==2:
        adb('shell','input','keyevent','61')
        adb('shell','input','text',PASSWORD)
    adb('shell','input','keyevent','4')  # Dismiss keyboard before finding the submit button.


adb('shell','am','start','-W','-n',COMPONENT)
wait_for('Make yourself at home.')
type_passwords()
tap(wait_for('Create my vault'))
wait_for('A place for every host.')
adb('shell','am','force-stop','com.prismalink.app')
adb('shell','am','start','-W','-n',COMPONENT)
wait_for('Welcome back.')
type_passwords()
tap(wait_for('Unlock workspace'))
wait_for('A place for every host.')
print('Android native WebView vault create/persist/restart/unlock passed.')
