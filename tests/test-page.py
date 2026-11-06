import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('builder',Path(__file__).resolve().parents[1]/'scripts/build-page.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class TestPage(unittest.TestCase):
 def test_brand_theme_is_scoped_and_escaped(self):
  d=self.data();d['documentTheme']={'accent':'#FFDD00','basis':'measured','evidenceIds':['brand']}
  markup=module.render(d)
  self.assertIn('--soft:#FFFD F0'.replace(' ',''),markup)
  self.assertIn('"color": "#111"',markup)
  ink=module.document_theme(d['documentTheme']).split('--accent:')[1].split(';')[0]
  self.assertNotEqual(ink,'#FFDD00')
  for value in ['red;display:none','#FFF','</style>']:
   d['documentTheme']['accent']=value
   with self.assertRaises(ValueError):module.render(d)
 def test_brand_theme_requires_evidence(self):
  d=self.data();d['documentTheme']={'accent':'#336DF4','basis':'inferred','evidenceIds':[]}
  with self.assertRaises(ValueError):module.render(d)
 def data(self):return {'title':'Study','components':[{'name':'button','kind':'button','states':[{'name':'default','basis':'measured','evidenceIds':['E1'],'styles':{'color':'#111'}}]}]}
 def test_data_cannot_close_script(self):
  d=self.data();d['title']='</script><img src=x onerror=alert(1)>';html=module.render(d)
  raw=html.split('id="design-data">')[1].split('</script>')[0]
  self.assertEqual(json.loads(raw)['title'],d['title']);self.assertNotIn('<img',raw)
 def test_unobserved_has_no_style(self):
  d=self.data();d['components'][0]['states'][0]['basis']='untested'
  with self.assertRaises(ValueError):module.validate(d)
 def test_missing_evidence_fails(self):
  d=self.data();d['components'][0]['states'][0]['evidenceIds']=[]
  with self.assertRaises(ValueError):module.validate(d)
 def test_style_and_url_restrictions(self):
  for prop,value in [('background-image','url(https://example.com)'),('color','red;position:fixed')]:
   d=self.data();d['components'][0]['states'][0]['styles']={prop:value}
   with self.assertRaises(ValueError):module.validate(d)
  for href in ['javascript:alert(1)','/etc/passwd','../private.json','//example.com','%2e%2e/private.json','screenshots/%2E%2E/%2e%2e/private.json','%2Fetc/passwd','..%5Cprivate.json']:
   d=self.data();d['attachments']=[{'label':'x','href':href}]
   with self.assertRaises(ValueError):module.validate(d)
 def test_invalid_hex_is_rejected(self):
  for color in ['#12345','#1234567']:
   d=self.data();d['colors']=[{'name':'Ink','value':color,'basis':'measured','evidenceIds':['E1']}]
   with self.assertRaises(ValueError):module.validate(d)
 def test_unmeasured_motion_is_not_replayed(self):
  d=self.data();d['motion']=[{'name':'x','basis':'observed','evidenceIds':['E1'],'frames':[{'opacity':0}],'duration':200}]
  with self.assertRaises(ValueError):module.validate(d)
if __name__=='__main__':unittest.main()
