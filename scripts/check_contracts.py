#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""檢查候選契約的一致性；不構成服務整合驗證。"""
import json,re,sys
from pathlib import Path
from jsonschema import Draft202012Validator
from openapi_spec_validator import validate
ROOT=Path(__file__).resolve().parents[1]
def load(name):return json.loads((ROOT/'protocol'/name).read_text())
def main():
 for p in (ROOT/'protocol').glob('*.schema.json'):Draft202012Validator.check_schema(json.loads(p.read_text()))
 api=load('openapi.json');validate(api)
 live=ROOT/'runtime/public/openapi.json'
 if live.exists():validate(json.loads(live.read_text()))
 caps=load('capabilities.json')['capabilities'];mcp=load('mcp-tools.json')['tools']
 ops={v['operationId']:v for path in api['paths'].values() for k,v in path.items() if k in ['get','post','put','patch','delete','head','options']}
 assert len(ops)==len(caps)
 assert len({c['id'] for c in caps})==len(caps)
 for c in caps:
  v=api['paths'][c['path']][c['method'].lower()]
  assert v['operationId']==c['operationId'] and v['x-jic-capability']==c['id']
  assert c['status']=='designed' and v['x-implementation-status']=='designed'
  assert set(re.findall(r'\{([^}]+)\}',c['path']))=={x['name'] for x in v['parameters'] if x.get('in')=='path'}
  if c['public'] and c['method'] not in ['GET','HEAD']:
   assert c['id'] in ['artifacts.validate','rights.assess','extensions.mcp']
  if c['visibilityDependent']:assert {} in v['security'] and {'JicJWT':[]} in v['security']
 for t in mcp:
  assert t['x-http-operationId'] in ops
  Draft202012Validator.check_schema(t['inputSchema'])
  def refs(x):
   if isinstance(x,dict):
    if '$ref' in x:
     path=x['$ref'];assert path.startswith('#/$defs/');assert path.split('/')[-1] in t['inputSchema'].get('$defs',{})
    for v in x.values():refs(v)
   elif isinstance(x,list):
    for v in x:refs(v)
  refs(t['inputSchema'])
  assert not any(p in t['inputSchema']['properties'] for p in ['token','privateKey','authorization'])
 secret=api['paths']['/v1/namespaces/{namespaceId}/secrets/{secretName}']
 assert 'get' not in secret
 assert 'value' not in api['components']['schemas']['SecretMetadata']['properties']
 for c in caps:
  if c['id'].startswith('economy.'):
   assert not any(x in c['path'] for x in ['/transfer','/sign','/withdraw'])
 print(json.dumps({'openapi':'valid-3.1','operations':len(caps),'groups':len(load('capabilities.json')['groups']),'mcpTools':len(mcp),'allCandidateEndpoints':'designed','worldSeedArtifacts':load('discovery.json')['worldSeedArtifacts']},ensure_ascii=False))
if __name__=='__main__':main()
