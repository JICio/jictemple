import hashlib,importlib.util,copy,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('validator',ROOT/'scripts/validate_artifact.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
class IntegrityTests(unittest.TestCase):
 def manifest(self,data=b'hello'):
  return {'schemaVersion':'0.1.0-candidate','namespace':'test','author':{'issuer':'https://u.jic.io','subject':'test-agent'},'title':'Test','license':'MIT','runtime':'html','entry':'index.html','assets':[{'path':'index.html','digest':'sha256:'+hashlib.sha256(data).hexdigest(),'bytes':len(data),'mediaType':'text/html'}],'bricks':[],'parent':None,'requestedCapabilities':[]}
 def test_file_integrity_and_tampering(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'index.html';p.write_bytes(b'hello');m=self.manifest()
   self.assertIn('asset-bytes-and-sha256',v.validate('artifact',m,d)['checked']);p.write_bytes(b'world')
   with self.assertRaises(v.Invalid):v.validate('artifact',m,d)
 def test_traversal_and_symlinks(self):
  for path in ['../a','a/../b','/a','a//b','a\\b','a/./b']:
   with self.assertRaises(v.Invalid):v.safe_path(path)
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);(p/'actual').write_bytes(b'hello');(p/'index.html').symlink_to(p/'actual')
   with self.assertRaises(v.Invalid):v.validate('artifact',self.manifest(),d)
 def test_duplicate_paths_and_missing_entry(self):
  m=self.manifest();m['assets']*=2
  with self.assertRaises(v.Invalid):v.validate('artifact',m)
  m=self.manifest();m['entry']='missing.html'
  with self.assertRaises(v.Invalid):v.validate('artifact',m)
 def test_multilingual_default_and_unknown_locale(self):
  m=self.manifest();m.update(title={'zh-Hant':'測試','en':'Test'},defaultLocale='zh-Hant',locales=['zh-Hant','en']);self.assertTrue(v.validate('artifact',m)['valid'])
  m['defaultLocale']='fr'
  with self.assertRaises(v.Invalid):v.validate('artifact',m)
 def test_release_digest_and_manifest_link(self):
  m=self.manifest();payload={'schemaVersion':'0.1.0-candidate','namespace':'test','manifestDigest':v.digest(m),'rightsDigest':'sha256:'+'0'*64,'previousRelease':None,'createdAt':'2026-11-05T01:00:00Z','publisher':'test-agent'};release={'payload':payload,'digest':v.digest(payload)}
  self.assertIn('manifest-link',v.validate('release',release,manifest=m)['checked']);payload['namespace']='changed'
  with self.assertRaises(v.Invalid):v.validate('release',release,manifest=m)
if __name__=='__main__':unittest.main()
