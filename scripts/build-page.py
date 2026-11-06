#!/usr/bin/env python3
"""Render a local, offline design study. No browsing or network requests."""
import argparse, json, re
from pathlib import Path
from urllib.parse import urlsplit, unquote

BASIS={'measured','observed','declared','inferred','untested'}

def document_theme(theme=None):
    """Theme the document chrome only; source specimens retain their own values."""
    if not theme:return ''
    if not isinstance(theme,dict) or not re.fullmatch(r'#[0-9a-fA-F]{6}',str(theme.get('accent',''))):
        raise ValueError('documentTheme.accent must be a six-digit hex color')
    if theme.get('basis') not in ('measured','observed','declared') or not theme.get('evidenceIds'):
        raise ValueError('Document brand color requires source evidence')
    rgb=tuple(int(theme['accent'][i:i+2],16) for i in (1,3,5))
    def luminance(color):
        c=[x/255 for x in color];c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c]
        return sum(x*y for x,y in zip(c,(.2126,.7152,.0722)))
    # Darken a light brand accent for small text on its tinted active background.
    ink=rgb
    while (luminance(tuple(round(x*.06+255*.94) for x in rgb))+.05)/(luminance(ink)+.05)<4.5:
        ink=tuple(max(0,int(x*.9)) for x in ink)
    def hexcode(c):return '#'+''.join(f'{x:02X}' for x in c)
    mix=lambda amount:hexcode(tuple(round(x*amount+255*(1-amount)) for x in rgb))
    values={'accent':hexcode(ink),'accent-ink':hexcode(ink),'soft':mix(.06),'canvas':mix(.025),
            'ruler':mix(.6),'demo-strong':mix(.15),'demo-line':mix(.35),'demo-text':hexcode(ink),
            'diagram-tint':mix(.09),'selection-ink':hexcode(ink),'selection-bg':mix(.16)}
    return ':root{'+''.join(f'--{k}:{v};' for k,v in values.items())+'}'
STYLE=set('color background-color font-family font-size font-weight line-height letter-spacing text-align text-transform display position max-width min-width width height min-height padding padding-top padding-right padding-bottom padding-left margin gap row-gap column-gap grid-template-columns align-items justify-content border border-color border-width border-style border-radius border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius box-shadow opacity transform transition-property transition-duration transition-delay transition-timing-function object-fit outline outline-offset overflow'.split())
def safe_url(value):
    if not isinstance(value,str) or not value or re.search(r'[\x00-\x20\\]',value):raise ValueError('Invalid link')
    parts=urlsplit(value)
    if parts.scheme not in ('','http','https') or value.startswith(('/','//')):raise ValueError('Unsupported link: '+value)
    if not parts.scheme:
        decoded=unquote(parts.path)
        if decoded.startswith('/') or '\\' in decoded or '..' in decoded.split('/'):
            raise ValueError('Local links must stay inside output directory')
    return value

def validate(data):
    if not isinstance(data,dict) or not data.get('title'):raise ValueError('title is required')
    document_theme(data.get('documentTheme'))
    if data.get('sourceUrl'):safe_url(data['sourceUrl'])
    def item(x):
        if x.get('basis') not in BASIS:raise ValueError('Unknown evidence basis')
        if x['basis']!='untested' and not x.get('evidenceIds'):raise ValueError('Evidence IDs required')
        if x['basis']=='untested' and (x.get('styles') or x.get('screenshot')):raise ValueError('Untested states cannot render source styles')
        for k,v in x.get('styles',{}).items():
            if k not in STYLE or not isinstance(v,str) or re.search(r'url\s*\(|expression|[{};<>]',v,re.I):raise ValueError('Unsafe or unsupported style: '+k)
        if x.get('screenshot'):safe_url(x['screenshot'])
    for group in ('colors','typography','layout','motion'):
        for x in data.get(group,[]):item(x)
    for group, entries in data.get('foundations',{}).items():
        if group not in ('style','spacing','padding','radius','border','shadow','icons'):raise ValueError('Unknown foundation')
        for x in entries:item(x)
    for x in data.get('colors',[]):
        if not re.fullmatch(r'#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})',x['value']):raise ValueError('Color sample must be valid hex')
    for x in data.get('foundations',{}).get('padding',[]):
        for value in x.get('sides',{}).values():
            if value is not None and not re.fullmatch(r'\d+(?:\.\d+)?px',str(value)):raise ValueError('Padding sides must be nonnegative px values')
    for c in data.get('components',[]):
        if c.get('presentation','compact') not in ('compact','panel','overlay'):raise ValueError('Unknown presentation mode')
        if 'category' in c and (not isinstance(c['category'],str) or not c['category'].strip()):raise ValueError('category must be a nonempty name')
        if c.get('kind') not in ('button','input','textarea','div'):raise ValueError('Unsupported component kind')
        if len({s['name'] for s in c['states']})!=len(c['states']):raise ValueError('Duplicate state')
        for s in c['states']:item(s)
        for t in c.get('tokens',[]):item(t)
    for m in data.get('motion',[]):
        if m.get('frames'):
            if m['basis']!='measured' or not isinstance(m.get('duration'),(int,float)) or not 0<m['duration']<=60000:raise ValueError('Motion playback requires measured positive duration')
            for frame in m['frames']:
                for k,v in frame.items():
                    if k not in ('opacity','transform','filter') or re.search(r'url\s*\(|[;{}<>]',str(v),re.I):raise ValueError('Unsupported animation keyframe')
    for p in data.get('pages',[]):
        safe_url(p['screenshot']);safe_url(p['url'])
    for a in data.get('attachments',[]):safe_url(a['href'])
    return data

def render(data):
    validate(data)
    raw=json.dumps(data,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    template=(Path(__file__).resolve().parent.parent/'assets/design-page.html').read_text(encoding="utf-8")
    css=(Path(__file__).resolve().parent.parent/'assets/design-document.css').read_text(encoding="utf-8")+document_theme(data.get('documentTheme'))
    navigation=(Path(__file__).resolve().parent.parent/'assets/study-navigation.js').read_text(encoding="utf-8")
    return template.replace('__DOCUMENT_CSS__',css).replace('__DESIGN_DATA__',raw).replace('__STUDY_NAVIGATION__',navigation)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('data',type=Path);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    content=render(json.loads(a.data.read_text(encoding="utf-8")));a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(content,encoding="utf-8")
    print(a.out.resolve())
