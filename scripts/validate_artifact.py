#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""離線格式與完整性驗證。此工具不登入、不取網路、不執行作品。"""
import argparse,hashlib,json,sys
from decimal import Decimal
from pathlib import Path,PurePosixPath
from datetime import datetime,timezone
from jsonschema import Draft202012Validator,FormatChecker
import rfc8785
ROOT=Path(__file__).resolve().parents[1]
NOT_VERIFIED=['identity','signature','copyright','payment','capability-authority','runtime-safety']
class Invalid(Exception):pass
def read_json(path):
 p=Path(path)
 if p.stat().st_size>2_000_000:raise Invalid('JSON 檔案超過離線工具的大小上限')
 return json.loads(p.read_text(encoding='utf8'))
def digest(value):return 'sha256:'+hashlib.sha256(rfc8785.dumps(value)).hexdigest()
def safe_path(name):
 if not isinstance(name,str) or not name or name.startswith('/') or '\\' in name or any(ord(c)<32 for c in name):raise Invalid('資產路徑必須是相對且不含控制字元')
 parts=name.split('/')
 if any(p in ('','.','..') for p in parts):raise Invalid('資產路徑包含空白層級或父目錄')
 return PurePosixPath(name)
def validate(kind,data,assets_dir=None,manifest=None):
 schema=read_json(ROOT/'protocol'/f'{kind}.schema.json')
 Draft202012Validator.check_schema(schema)
 errors=list(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(data))
 if errors:
  e=errors[0];raise Invalid('格式不符：'+('/'.join(str(x) for x in e.absolute_path) or '$')+'；規則 '+e.validator)
 checked=['json-schema']
 if kind=='artifact':
  for field in ['title','summary']:
   if isinstance(data.get(field),dict):
    if data.get('defaultLocale') not in data[field] or data.get('defaultLocale') not in data.get('locales',[]) or any(k not in data.get('locales',[]) for k in data[field]):raise Invalid('多語言欄位需包含預設語言，且不得超出 locales')
  names=[]
  for asset in data['assets']:
   safe_path(asset['path']);names.append(asset['path'])
  safe_path(data['entry'])
  if len(names)!=len(set(names)):raise Invalid('同一 manifest 的資產路徑不能重複')
  if data['entry'] not in names:raise Invalid('入口必須列在資產清單中')
  checked.append('entry-and-paths')
  if assets_dir:
   root=Path(assets_dir).resolve(strict=True)
   if not root.is_dir():raise Invalid('資產根目錄不存在')
   for asset in data['assets']:
    rel=safe_path(asset['path']);p=root
    for part in rel.parts:
     p=p/part
     if p.is_symlink():raise Invalid('不接受含符號連結的資產路徑')
    if not p.resolve(strict=True).is_relative_to(root) or not p.is_file():raise Invalid('資產不在根目錄內或不是普通檔案')
    if p.stat().st_size!=asset['bytes']:raise Invalid('資產實際長度與聲明不同')
    h=hashlib.sha256()
    with p.open('rb') as f:
     for chunk in iter(lambda:f.read(65536),b''):h.update(chunk)
    if 'sha256:'+h.hexdigest()!=asset['digest']:raise Invalid('資產內容摘要不符')
   checked.append('asset-bytes-and-sha256')
 elif kind=='release':
  if digest(data['payload'])!=data['digest']:raise Invalid('發布信封的 JCS 內容摘要不符')
  checked.append('release-payload-digest')
  if manifest is not None:
   if digest(manifest)!=data['payload']['manifestDigest']:raise Invalid('發布信封指向的 manifest 摘要不符')
   if manifest['namespace']!=data['payload']['namespace']:raise Invalid('發布信封與 manifest 命名空間不同')
   checked.append('manifest-link')
 elif kind=='capability':
  if data['exp']<=data['nbf']:raise Invalid('能力到期時間必須晚於生效時間')
  checked.append('time-window-shape')
 elif kind=='settlement-intent':
  d=data['display']
  if Decimal(d['nav'])<=0 or Decimal(d['amount'])<=0:raise Invalid('NAV 與 LOVE 顯示金額需大於零')
  if datetime.fromisoformat(d['validUntil'].replace('Z','+00:00'))<=datetime.fromisoformat(d['quotedAt'].replace('Z','+00:00')):raise Invalid('報價期限必須晚於報價時間')
  if data['method']=='payUsdc' and int(data['recipient'],16)==0:raise Invalid('payUsdc 收款方不能為零地址')
  checked.append('quote-and-recipient-shape')
 elif kind=='rights':
  seen=set()
  for a in data['components']:
   safe_path(a['path'])
   if a['path'] in seen:raise Invalid('權利清單的資產路徑不能重複')
   seen.add(a['path'])
  checked.append('component-paths')
 elif kind=='tool':
  Draft202012Validator.check_schema(data['inputSchema']);Draft202012Validator.check_schema(data['outputSchema'])
  checked.append('tool-io-schemas')
 return {'valid':True,'kind':kind,'checked':checked,'notVerified':NOT_VERIFIED,'implementationStatus':'offline-tool-only'}
def main():
 a=argparse.ArgumentParser(description=__doc__);a.add_argument('kind',choices=['artifact','release','capability','settlement-intent','rights','tool']);a.add_argument('file');a.add_argument('--assets-dir');a.add_argument('--manifest');args=a.parse_args()
 try:
  result=validate(args.kind,read_json(args.file),args.assets_dir,read_json(args.manifest) if args.manifest else None);print(json.dumps(result,ensure_ascii=False));return 0
 except Exception as e:
  message=str(e) if isinstance(e,Invalid) else '無法讀取或驗證輸入；未輸出檔案內容'
  print(json.dumps({'valid':False,'error':message,'notVerified':NOT_VERIFIED},ensure_ascii=False));return 1
if __name__=='__main__':sys.exit(main())
