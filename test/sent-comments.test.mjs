import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const plain = value => JSON.parse(JSON.stringify(value))
function load() {
  let definition
  vm.runInNewContext(bundle, { window: { __ModuleLoader__: { load(value) { definition = value } } } })
  return definition.factory(id => { assert.equal(id, 'react'); return React })
}
const wire = (number = 1, quote = 'original quote', note = 'comment') => `<selection_comment index="${number}"><quote>${quote}</quote><note>${note}</note></selection_comment>`
function project(rule, text) {
  const result = []
  let from = 0
  for (let node; (node = rule.match(text, from)) !== undefined;) {
    assert.ok(node.start >= from && node.end > node.start && node.end <= text.length)
    if (node.start > from) result.push({ id: 'text', raw: text.slice(from, node.start) })
    result.push({ ...plain(node), raw: text.slice(node.start, node.end) })
    from = node.end
  }
  if (from < text.length) result.push({ id: 'text', raw: text.slice(from) })
  return result
}

test('sent text rule recognizes both the actual codec output and historical compact tags', async () => {
  const { __test: api } = load()
  const annotation = api.addAnnotation('session', { quote: ' quote\nwith lines ', note: ' full note ' })
  const serialized = await api.createSelectionCommentSource().codec.serialize(annotation.ref)
  const rule = api.createSentCommentRule()
  const node = rule.match(serialized, 0)
  assert.deepEqual(plain(node), { id: rule.id, start: 0, end: serialized.length, data: { number: 1, quote: 'quote\nwith lines', note: 'full note' } })
  assert.equal(rule.match(wire(), 0).data.note, 'comment')
})
test('range projection preserves surrounding plain text, repeated cards and foreign references exactly', () => {
  const rule = load().__test.createSentCommentRule()
  const raw = `Before @file 😀\n${wire()}\nBetween @[Session](dsh-session:x)\n${wire(2)} after ${wire()}`
  const nodes = project(rule, raw)
  assert.equal(nodes.map(node => node.raw).join(''), raw)
  assert.deepEqual(nodes.filter(node => node.id === rule.id).map(node => node.data.number), [1, 2, 1])
  assert.equal(rule.match(raw, raw.indexOf(wire()) + 1).data.number, 2)
  assert.equal(rule.match(raw, raw.length), undefined)
})
test('history presentation uses only sent text, never current annotations or tab storage', async () => {
  const { __test: api } = load()
  const item = api.addAnnotation('history', { quote: 'Historical quote', note: 'Historical note' })
  const raw = await api.createSelectionCommentSource().codec.serialize(item.ref)
  api.updateAnnotation('history', item.id, { note: 'New draft note' })
  api.removeAnnotation('history', item.id)
  assert.deepEqual(plain(load().__test.createSentCommentRule().match(raw, 0).data), { number: 1, quote: 'Historical quote', note: 'Historical note' })
})
test('wire entities decode only once and preserve literal entity text, quotes, unicode and line breaks', () => {
  const api = load().__test
  const raw = api.serializeAnnotationContext({ number: 7, quote: '<b> &lt; & "quoted" 😀\nnext', note: '</note><script>alert(1)</script> &amp;' })
  const data = api.createSentCommentRule().match(raw, 0).data
  assert.equal(data.quote, '<b> &lt; & "quoted" 😀\nnext')
  assert.equal(data.note, '</note><script>alert(1)</script> &amp;')
  assert.equal(api.decodeContextText('&amp;lt; &unknown; &#60;'), '&lt; &unknown; &#60;')
})
test('incomplete, nested, raw HTML, unknown attributes and invalid indices fall back to original text', () => {
  const rule = load().__test.createSentCommentRule()
  for (const raw of [
    wire().slice(0, -1), wire(0), wire(-1), wire('01'), wire('9007199254740992'),
    wire().replace('index="1"', 'index="1" extra="x"'),
    wire(1, '<img src=x onerror=alert(1)>'), wire(1, 'x', '<note>nested</note>'),
    '&lt;selection_comment index="1"&gt;', '[Comment1]', 'plain text',
  ]) {
    assert.equal(rule.match(raw, 0), undefined, raw)
    assert.equal(project(rule, raw).map(node => node.raw).join(''), raw)
  }
})
test('a malformed earlier block does not swallow a later complete historical card', () => {
  const raw = wire().slice(0, -25) + '\n' + wire(2)
  const node = load().__test.createSentCommentRule().match(raw, 0)
  assert.equal(node.data.number, 2)
  assert.equal(raw.slice(node.start, node.end), wire(2))
})
test('maximum-size content is retained with no model/plain-text truncation', () => {
  const api = load().__test, quote = '<>&😀'.repeat(4000), note = 'N\n'.repeat(10000)
  const raw = api.serializeAnnotationContext({ number: 1, quote, note })
  assert.equal(api.createSentCommentRule().match(raw, 0).data.quote, quote)
  assert.equal(api.createSentCommentRule().match(raw, 0).data.note, note.trim())
})
test('real React renderer escapes all content and exposes a labelled compact card without raw wire tags', () => {
  const api = load().__test
  const node = api.createSentCommentRule().match(wire(4, '&lt;img src=x onerror="alert(1)"&gt;', '&lt;script&gt;danger&lt;/script&gt;'), 0)
  const html = renderToStaticMarkup(React.createElement(api.SentCommentNode, { node, interactive: true }))
  assert.match(html, /data-selection-comment-card="4"/)
  assert.match(html, /aria-expanded="false"/)
  assert.match(html, /aria-label="展开原文和注释 4"/)
  assert.match(html, /&lt;img/)
  assert.doesNotMatch(html, /<img|<script|<selection_comment|dangerouslySetInnerHTML/)
})
test('noninteractive queue presentation remains inline, readable and free of nested controls', () => {
  const api = load().__test
  api.setLocalePreference('en')
  const node = api.createSentCommentRule().match(wire(3), 0)
  const html = renderToStaticMarkup(React.createElement(api.SentCommentNode, { node, interactive: false }))
  assert.match(html, /Comment 3 · “original quote” — comment/)
  assert.doesNotMatch(html, /<button|sc-sent-card|<selection_comment/)
})
test('official service/slot registrations are optional, keyed correctly and disposable', () => {
  const plugin = load(), rules = [], slots = [], effects = [], injections = []
  const ctx = {
    effect(fn) { const off = fn(); if (off) effects.push(off); return off },
    inputTriggers: { registerSource() { return () => {} } },
    uiConversation: { userText: { register(rule) { rules.push(rule); return () => rules.splice(rules.indexOf(rule), 1) } } },
    slots: { inject(_name, fn) { return fn() }, register(metadata, component) { slots.push({ metadata, component }); return () => {} } },
    inject(names, fn) { injections.push(names[0]); if (names[0] === 'uiConversation') fn(ctx) },
  }
  plugin.apply(ctx)
  assert.deepEqual(injections, ['locale', 'uiConversation'])
  assert.equal(rules.length, 1)
  const entry = slots.find(entry => entry.metadata.name === 'conversation.user.text.node')
  assert.equal(entry.metadata.key, rules[0].id)
  assert.equal(entry.component, plugin.__test.SentCommentNode)
  for (const off of effects.reverse()) off()
  assert.equal(rules.length, 0)
  assert.doesNotThrow(() => plugin.__test.registerSentComments({}))
  assert.doesNotThrow(() => plugin.__test.registerSentComments({ uiConversation: {} }))
})
test('primary actions consume the matched opaque fill/foreground/hover family, never bg-base for text', () => {
  const css = load().__test.STYLE_TEXT
  const button = css.match(/\.sc-button \{([^}]+)\}/)[1]
  const primary = css.match(/\.sc-primary \{([^}]+)\}/)[1]
  for (const styles of [button, primary]) {
    assert.match(styles, /background: var\(--dsw-alias-button-primary-fill, #1f2328\)/)
    assert.match(styles, /color: var\(--dsw-alias-label-primary-foreground, #ffffff\)/)
    assert.doesNotMatch(styles, /color: var\(--dsw-alias-bg-base/)
  }
  for (const selector of ['sc-button', 'sc-primary']) {
    assert.match(css, new RegExp(`\\.${selector}:hover \\{ background: var\\(--dsw-alias-button-primary-hover, #343a40\\)`))
    assert.match(css, new RegExp(`\\.${selector}:focus-visible`))
  }
})

// Optional compatibility check against the real supplied host scheduler, without
// copying host implementation into the extension or importing private runtime APIs.
test('official host UserTextDocument accepts the contribution and keeps the complete raw text', { skip: !process.env.DSH_CONVERSATION_BUNDLE }, () => {
  const code = readFileSync(process.env.DSH_CONVERSATION_BUNDLE, 'utf8')
  const marker = '//#region lib/types/client/conversation/user-text-document.js'
  const start = code.indexOf(marker), end = code.indexOf('//#endregion', start)
  assert.ok(start >= 0 && end > start, 'Expected supplied host scheduler module')
  const context = vm.createContext({})
  vm.runInContext(code.slice(start + marker.length, end) + '\nthis.Document = UserTextDocument', context)
  const raw = `start ${wire()} middle ${wire(2)} end`
  const document = new context.Document()
  const output = document.evaluate({ text: raw, facts: {} }, [load().__test.createSentCommentRule()])
  assert.equal(output.map(node => raw.slice(node.start, node.end)).join(''), raw)
  assert.equal(output.filter(node => node.id === 'selection-comment').length, 2)
})
