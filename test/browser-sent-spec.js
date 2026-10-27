async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
  const results = []
  const check = (name, value, detail) => { results.push({ name, pass: !!value, detail }); if (!value) throw new Error(name + (detail ? ': ' + detail : '')) }
  const demo = window.commentDemo, api = demo.api, h = React.createElement
  const body = document.body
  const overlay = document.querySelector('[data-selection-comment-ui]'), shadow = overlay.shadowRoot
  const action = shadow.querySelector('.sc-button'), primary = shadow.querySelector('.sc-primary')
  const previousStyle = body.getAttribute('style'), previousDark = body.getAttribute('data-ds-dark-theme')
  check('official optional userText registration and keyed renderer were contributed', demo.textRules.has('selection-comment') && demo.textRenderers.has('selection-comment'))
  check('floating action remains in a body-mounted ShadowRoot', overlay.parentElement === body && shadow instanceof ShadowRoot)
  function ratio(fg, bg) {
    const luminance = rgb => {
      const values = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
    }
    const a = luminance(fg), b = luminance(bg)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }
  const themes = [
    { name: 'light', fill: 'rgb(31, 35, 40)', fg: 'rgb(255, 255, 255)', hover: 'rgb(52, 58, 64)', base: '#fff', layer: '#fff', label: '#1f2328', secondary: '#4b5563' },
    { name: 'dark', fill: 'rgb(244, 244, 245)', fg: 'rgb(24, 24, 27)', hover: 'rgb(212, 212, 216)', base: '#18181b', layer: '#27272a', label: '#f4f4f5', secondary: '#d4d4d8' },
    { name: 'transparent', fill: 'rgb(42, 73, 168)', fg: 'rgb(255, 255, 255)', hover: 'rgb(32, 58, 140)', base: 'transparent', layer: '#fff', label: '#1f2328', secondary: '#4b5563' },
  ]
  for (const theme of themes) {
    if (theme.name === 'dark') body.setAttribute('data-ds-dark-theme', '')
    else body.removeAttribute('data-ds-dark-theme')
    for (const [key, value] of Object.entries({ 'button-primary-fill': theme.fill, 'label-primary-foreground': theme.fg, 'button-primary-hover': theme.hover, 'bg-base': theme.base, 'bg-layer-1': theme.layer, 'label-primary': theme.label, 'label-secondary': theme.secondary })) body.style.setProperty('--dsw-alias-' + key, value)
    for (const [name, element] of [['floating', action], ['dialog', primary]]) {
      const style = getComputedStyle(element)
      check(theme.name + ' ' + name + ' uses matching fill/text even with a transparent base', style.backgroundColor === theme.fill && style.color === theme.fg, `${style.backgroundColor}/${style.color}`)
      check(theme.name + ' ' + name + ' normal/hover colors have readable contrast', ratio(theme.fg, theme.fill) >= 4.5 && ratio(theme.fg, theme.hover) >= 4.5)
    }
  }
  for (const key of ['button-primary-fill', 'label-primary-foreground', 'button-primary-hover']) body.style.removeProperty('--dsw-alias-' + key)
  const fallback = getComputedStyle(action)
  check('missing primary tokens use the paired opaque fallback rather than transparent bg-base', fallback.backgroundColor === 'rgb(31, 35, 40)' && fallback.color === 'rgb(255, 255, 255)')
  if (previousStyle === null) body.removeAttribute('style'); else body.setAttribute('style', previousStyle)
  if (previousDark === null) body.removeAttribute('data-ds-dark-theme'); else body.setAttribute('data-ds-dark-theme', previousDark)

  const first = api.listAnnotations('public-demo-A')[0]
  const sentRaw = await demo.sources.get('selection-comment').codec.serialize(first.ref)
  const sentNode = api.createSentCommentRule().match(sentRaw, 0)
  document.querySelector('[data-demo-pane="public-demo-A"] .send').click()
  await sleep(100)
  const card = document.querySelector('[data-demo-pane="public-demo-A"] [data-selection-comment-card]')
  check('synthetic send renders the registered card in the user bubble', card && card.closest('[data-demo-sent]'))
  check('sent card has the exact quote and full note, without XML wrapper text', card.querySelector('.sc-sent-quote').textContent === sentNode.data.quote && card.querySelector('.sc-sent-note').textContent === sentNode.data.note && !card.textContent.includes('<selection_comment'))
  check('raw model payload is unchanged in the separate raw-context preview', document.querySelector('[data-demo-pane="public-demo-A"] .output').textContent === sentRaw)
  check('card starts compact with three quote lines and four comment lines', getComputedStyle(card.querySelector('.sc-sent-quote')).webkitLineClamp === '3' && getComputedStyle(card.querySelector('.sc-sent-note')).webkitLineClamp === '4')
  const toggle = card.querySelector('.sc-sent-toggle')
  toggle.click(); await sleep(20)
  check('expand exposes the complete scrollable text with accessible state', card.dataset.expanded === 'true' && toggle.getAttribute('aria-expanded') === 'true' && getComputedStyle(card.querySelector('.sc-sent-body')).overflowY === 'auto')
  toggle.click(); await sleep(20)
  check('collapse restores the compact card', card.dataset.expanded === 'false')
  api.updateAnnotation('public-demo-A', first.id, { note: 'Later draft edit, not a history rewrite' })
  check('editing local draft annotations does not rewrite sent text', card.querySelector('.sc-sent-note').textContent === sentNode.data.note)
  api.updateAnnotation('public-demo-A', first.id, { note: first.note })

  // Standalone historical/queue Factory adapter. Original text remains the copy
  // and edit currency; this does not claim testing the real Host clipboard menu.
  const fixture = document.createElement('section'); fixture.dataset.sentTestFixture = ''; body.append(fixture)
  const root = ReactDOM.createRoot(fixture)
  const historical = 'Before\n<selection_comment index="9"><quote>A &lt; B &amp; literal &amp;lt;\nsecond line</quote><note>&lt;img src=x onerror="window.unwanted=true"&gt; comment</note></selection_comment>\nAfter @file'
  const renderHistorical = interactive => root.render(h('div', null,
    h('div', { 'data-history-bubble': '' }, h(demo.UserText, { text: historical, interactive })),
    h('button', { 'data-copy-original': '', onClick: () => { fixture.dataset.copied = historical } }, 'Copy original'),
    h('textarea', { 'data-edit-original': '', defaultValue: historical })))
  renderHistorical(true); await sleep(40)
  let historyCard = fixture.querySelector('[data-selection-comment-card="9"]')
  check('history renders without a matching local annotation/ref', historyCard && !api.listAnnotations('public-demo-A').some(item => item.number === 9))
  check('history decodes entities only once and keeps line breaks', historyCard.querySelector('.sc-sent-quote').textContent === 'A < B & literal &lt;\nsecond line')
  check('HTML-like note is inert text, never an executable element', !window.unwanted && !fixture.querySelector('img') && historyCard.querySelector('.sc-sent-note').textContent.includes('<img'))
  const historyText = fixture.querySelector('[data-history-bubble]').textContent
  check('surrounding plain text and foreign references remain visible', historyText.startsWith('Before\n') && historyText.endsWith('\nAfter @file'))
  fixture.querySelector('[data-copy-original]').click()
  check('synthetic copy action uses original, complete wire text', fixture.dataset.copied === historical)
  check('synthetic edit uses the exact original text including newlines', fixture.querySelector('[data-edit-original]').value === historical)
  api.setLocalePreference('en'); await sleep(20)
  check('already-rendered card labels follow locale', historyCard.getAttribute('aria-label') === 'Comment 9')
  renderHistorical(false); await sleep(30)
  check('queue preview stays inline and noninteractive', fixture.querySelector('[data-selection-comment-preview]') && !fixture.querySelector('[data-selection-comment-card]') && !fixture.querySelector('[data-selection-comment-preview] button'))
  root.unmount(); fixture.remove()
  // Restore earlier suite preference and leave a visible floating action for the
  // driver's native browser hover/focus pseudo-state computed-style checks.
  api.setLocalePreference('auto'); demo.setLocale('en')
  demo.select('public-demo-A', 'main', 24, 40); await sleep(80)
  check('floating action available for native hover/focus checks', action.hidden === false)
  return { checkCount: results.length, results }
}
