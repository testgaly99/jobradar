"""Kleine XLSX-Lesehilfe ohne Zusatzpaket (auch Lücken und Inline-Strings)."""
from io import BytesIO
import posixpath
import re
from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def zeilen(daten, blatt=0):
    with ZipFile(BytesIO(daten)) as z:
        if sum(i.file_size for i in z.infolist()) > 128 * 1024 * 1024:
            raise ValueError('XLSX zu groß')
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            strings = [''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', NS)]
        sheets = ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet', NS)
        rid = sheets[blatt].get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        target = next(r.get('Target') for r in rels if r.get('Id') == rid)
        pfad = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
        ergebnis = []
        for row in ET.fromstring(z.read(pfad)).findall('s:sheetData/s:row', NS):
            werte = []
            for c in row.findall('s:c', NS):
                col = re.match('[A-Z]+', c.get('r', '')).group()
                index = 0
                for buchstabe in col:
                    index = index * 26 + ord(buchstabe) - 64
                while len(werte) < index:
                    werte.append('')
                v = c.find('s:v', NS)
                text = '' if v is None else v.text or ''
                if c.get('t') == 's':
                    text = strings[int(text)]
                elif c.get('t') == 'inlineStr':
                    text = ''.join(c.find('s:is', NS).itertext())
                werte[index - 1] = text
            ergebnis.append(werte)
        return ergebnis
