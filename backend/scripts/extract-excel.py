"""Read the source workbook without modifying it. Optional tool: pip install openpyxl.

Run locally with Python, then deploy the generated JSON for Node-only MySQL imports.
"""
import json
import sys
from collections import Counter
from datetime import date, datetime
from pathlib import Path
import openpyxl

data_dir = Path(__file__).resolve().parents[1] / 'data'
source = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else data_dir / 'players.xlsx'
fields = ['PLAYER_ID', 'FIRST_NAME', 'LAST_NAME', 'NAME', 'PLAYER_CODE', 'COUNTRY', 'DOB', 'SUB_POSITION', 'POSITION', 'FOOT', 'HEIGHT_CM', 'POSITIONS', 'POSITION_CODE', 'UPD_DATE', 'UPD_BY']
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
sheet = workbook.worksheets[0]
values = iter(sheet.values)
if list(next(values)) != fields:
    raise ValueError('The first sheet must contain the 15 PLAYERS column headers in schema order.')
records = []
for values_row in values:
    if not any(value is not None for value in values_row):
        continue
    row = dict(zip(fields, values_row))
    for field, value in row.items():
        if isinstance(value, (date, datetime)):
            row[field] = value.strftime('%Y-%m-%d' if field == 'DOB' else '%Y-%m-%d %H:%M:%S')
    records.append(row)
ids = Counter(row['PLAYER_ID'] for row in records)
if len(ids) != len(records):
    raise ValueError('Duplicate PLAYER_ID values must be resolved before import.')
codes = Counter(row['PLAYER_CODE'] for row in records)
report = {
    'source': source.name,
    'sheet': sheet.title,
    'records': len(records),
    'duplicateCodeGroups': sum(count > 1 for count in codes.values()),
    'rowsBeyondFirstSharedCode': sum(count - 1 for count in codes.values()),
    'missingPositionGroups': sum(row['POSITION'] is None for row in records),
    'missingPositionCodes': sum(row['POSITION_CODE'] is None for row in records),
    'heightsUnder100cm': [{'PLAYER_ID': row['PLAYER_ID'], 'NAME': row['NAME'], 'HEIGHT_CM': row['HEIGHT_CM']} for row in records if row['HEIGHT_CM'] is not None and row['HEIGHT_CM'] < 100],
    'policy': 'Every source row and original value is retained. Shared codes do not identify duplicate players. Missing fields and unusual heights are not guessed or repaired.',
}
workbook.close()
(data_dir / 'players-excel.json').write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
(data_dir / 'players-import-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key != 'heightsUnder100cm'}, ensure_ascii=False))
