/* Read-only browser callback. Run only through a host browser's permitted page evaluation API.
   Records the current DOM state; interaction/scroll/theme coverage is the caller's job. */
(() => {
  const props = ['color', 'background-color', 'background-image', 'font-family', 'font-size',
    'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'display',
    'position', 'max-width', 'width', 'height', 'padding-top', 'padding-right', 'padding-bottom',
    'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap',
    'row-gap', 'column-gap', 'grid-template-columns', 'align-items', 'justify-content',
    'border-top', 'border-right', 'border-bottom', 'border-left', 'border-top-left-radius',
    'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'box-shadow', 'opacity', 'transform', 'transition-property', 'transition-duration',
    'transition-delay', 'transition-timing-function', 'animation-name', 'animation-duration',
    'animation-delay', 'animation-timing-function', 'object-fit', 'outline'];
  const selector = el => {
    const parts = [];
    for (let node = el; node?.nodeType === 1 && parts.length < 7; node = node.parentElement) {
      const index = [...(node.parentElement?.children || [])].indexOf(node) + 1;
      parts.unshift(`${node.localName}${index ? `:nth-child(${index})` : ''}`);
    }
    return parts.join(' > ');
  };
  const clean = value => value.replace(/url\([^)]*\)/gi, 'url([image-url])');
  const values = style => Object.fromEntries(props.map(p => [p, clean(style.getPropertyValue(p))]));
  const candidates = [...document.querySelectorAll('header,nav,main,section,article,footer,h1,h2,h3,h4,h5,h6,p,a,button,input,select,textarea,[role],img,video,figure,[class*="card"],[class*="container"]')];
  const samples = [];
  for (const el of candidates.slice(0, 3000)) {
    if (el.closest('[data-private], [autocomplete="current-password"], [autocomplete="new-password"]')) continue;
    const rect = el.getBoundingClientRect(), css = getComputedStyle(el);
    if (rect.width <= 0 || rect.height <= 0 || css.display === 'none' || css.visibility === 'hidden') continue;
    const sample = {
      target: selector(el), tag: el.localName, role: el.getAttribute('role'),
      state: {disabled: el.matches(':disabled,[aria-disabled="true"]'), focused: el === document.activeElement,
        hovered: el.matches(':hover'), selected: el.matches(':checked,[aria-selected="true"],[aria-pressed="true"]')},
      rect: {x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height},
      styles: values(css), pseudo: {}
    };
    for (const pseudo of ['::before', '::after']) {
      const p = getComputedStyle(el, pseudo);
      if (p.content !== 'none' && p.content !== 'normal') sample.pseudo[pseudo] = values(p);
    }
    // Do not collect innerText, form values, hidden inputs, cookies, or source HTML.
    samples.push(sample);
  }
  const rootStyle = getComputedStyle(document.documentElement);
  const variables = Object.fromEntries([...rootStyle].filter(p => /^--.*(color|bg|surface|border|text|font|space|gap|radius|shadow|duration|easing|width|height|size)/i.test(p)).slice(0, 200)
    .map(p => [p, clean(rootStyle.getPropertyValue(p).trim())]));
  const rules = [], inaccessibleSheets = [], mediaConditions = new Set(), fontFaces = [];
  let scannedRuleCount = 0;
  const walk = (items, conditions = []) => {
    for (const rule of items) {
      if (rules.length >= 600 || scannedRuleCount++ >= 6000) return;
      if (rule.conditionText) mediaConditions.add(rule.conditionText);
      if (rule.selectorText && /:(hover|focus|active|disabled|checked)|aria-selected|aria-pressed/.test(rule.selectorText)) {
        // Keep style properties, not generated content or URLs embedded in arbitrary declarations.
        rules.push({selector: rule.selectorText, conditions, styles: values(rule.style)});
      }
      if (rule.type === CSSRule.FONT_FACE_RULE && fontFaces.length < 100) fontFaces.push(Object.fromEntries(
        ['font-family','font-style','font-weight','font-display'].map(p=>[p,rule.style.getPropertyValue(p)])));
      if (rule.cssRules?.length) walk(rule.cssRules, rule.conditionText ? [...conditions, rule.conditionText] : conditions);
    }
  };
  for (const sheet of document.styleSheets) {
    try {walk(sheet.cssRules);} catch {inaccessibleSheets.push(sheet.href ? new URL(sheet.href).origin : 'inline');}
  }
  const animations = document.getAnimations().slice(0, 100).map(a => {
    const effect = a.effect, timing = effect?.getTiming();
    return {target: effect?.target instanceof Element ? selector(effect.target) : null,
      playState: a.playState, currentTime: a.currentTime, timing: timing ? {
        delay: timing.delay, duration: timing.duration, easing: timing.easing,
        iterations: Number.isFinite(timing.iterations) ? timing.iterations : 'infinite', fill: timing.fill
      } : null,
      keyframes: effect?.getKeyframes().slice(0, 10).map(frame => Object.fromEntries(Object.entries(frame)
        .filter(([key]) => ['offset','computedOffset','easing','opacity','transform','filter','clipPath'].includes(key))))};
  });
  const routeUrl = new URL(location.origin + location.pathname);
  const queryKeys = [];
  for (const [key, value] of new URL(location.href).searchParams) {
    queryKeys.push(key);
    if (['page','view','tab','section','lang','locale','theme'].includes(key)) routeUrl.searchParams.append(key, value.slice(0, 100));
  }
  return {schemaVersion: 'catchart.website-observation.v1', url: routeUrl.href, queryKeys,
    capturedAt: new Date().toISOString(), viewport: {width: innerWidth, height: innerHeight, dpr: devicePixelRatio},
    scroll: {x: scrollX, y: scrollY, height: document.documentElement.scrollHeight},
    theme: {colorScheme: rootStyle.colorScheme, prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches},
    fontLoadingStatus: document.fonts?.status || 'unknown', fontFaces,
    mediaConditions: [...mediaConditions], variables, samples, rules, animations,
    coverage: {candidateCount: candidates.length, sampledCount: samples.length, elementLimit: 3000,
      ruleLimit: 600, scannedRuleCount, scanLimit: 6000, inaccessibleSheetOrigins: inaccessibleSheets}};
})
