import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'

const code = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const plain = value => JSON.parse(JSON.stringify(value))
function memoryStorage() {
  const map = new Map()
  return {
    get length() { return map.size }, key: i => [...map.keys()][i] ?? null,
    getItem: key => map.get(key) ?? null,
    setItem(key, value) { map.set(key, String(value)) },
    removeItem(key) { map.delete(key) },
  }
}
function load(storage = memoryStorage(), document) {
  let definition
  vm.runInNewContext(code, {
    console, crypto: globalThis.crypto, document,
    window: { sessionStorage: storage, __ModuleLoader__: { load: value => { definition = value } } },
  })
  const plugin = definition.factory(id => {
    assert.equal(id, 'react')
    return { createElement() {}, useEffect() {}, useRef() {}, useState() {} }
  })
  return { api: plugin.__test, plugin, storage }
}
const add = (api, session = 'test') => api.addAnnotation(session, { quote: 'Synthetic quote <unsafe>', note: 'Synthetic comment & detail', anchor: null })

test('English is the deterministic fallback; Simplified Chinese and zh-* variants are supported', () => {
  const { api } = load()
  assert.equal(api.t('addTitle'), 'Add comment')
  api.setLocale('zh-CN'); assert.equal(api.t('addTitle'), '添加注释')
  api.setLocale('zh-Hant'); assert.equal(api.t('addTitle'), '添加注释')
  api.setLocale('fr'); assert.equal(api.t('addTitle'), 'Add comment')
  assert.equal(api.t('not-a-key'), 'not-a-key')
})
test('locale key sets and interpolation parameters match', () => {
  const en = JSON.parse(fs.readFileSync(new URL('../locale/en.json', import.meta.url)))
  const zh = JSON.parse(fs.readFileSync(new URL('../locale/zh.json', import.meta.url)))
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort())
  for (const key of Object.keys(en)) {
    const params = value => [...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()
    assert.deepEqual(params(en[key]), params(zh[key]), key)
  }
})
test('DSH locale service changes are observed and the subscription is disposed', () => {
  const { api } = load(); let active = 'zh-CN', listener, disposed = false
  const off = api.attachLocale({ getSnapshot: () => ({ active }), subscribe(fn) { listener = fn; return () => { disposed = true } } })
  assert.equal(api.t('save'), '保存')
  active = 'en'; listener(); assert.equal(api.t('save'), 'Save')
  off(); assert.equal(disposed, true)
})
test('reference identity, clipboard token and XML context do not depend on locale', async () => {
  const { api } = load(); const item = add(api)
  const source = api.createSelectionCommentSource(); const before = await source.codec.serialize(item.ref)
  api.setLocale('zh')
  assert.equal(source.codec.clipboardText(item.ref), '[Comment1]')
  assert.equal(await source.codec.serialize(item.ref), before)
  assert.match(before, /&lt;unsafe&gt;/); assert.match(before, /&amp; detail/)
})
test('locale-only draft metadata update preserves text, offsets, other sources and command', () => {
  const { api } = load(); const item = add(api)
  let input = api.appendAnnotationToken({ draft: '/cmd @file  ', claim: { token: '/cmd ' }, occurrences: [{ source: 'file', ref: 'f', offset: 5, length: 5, label: 'file', clipboardText: '@file' }] }, item)
  const before = plain(input); api.setLocale('zh-CN')
  const localized = api.localizedDraft(input)
  assert.equal(localized.text, before.text)
  assert.deepEqual(plain(localized.references[0]), before.references[0])
  assert.equal(localized.references[1].offset, before.references[1].offset)
  assert.equal(localized.references[1].length, before.references[1].length)
  assert.equal(localized.references[1].label, '注释 1')
  assert.deepEqual(plain(localized.command), before.command)
  assert.equal(api.localizedDraft(localized), null)
})
test('fresh bundle restores tab-scoped quote/note before a codec call, without a mounted overlay', async () => {
  const first = load(); const item = add(first.api)
  first.api.updateAnnotation('test', item.id, { note: 'Edited before reload' })
  const fresh = load(first.storage)
  assert.match(await fresh.api.createSelectionCommentSource().codec.serialize(item.ref), /Edited before reload/)
  assert.equal(fresh.api.listAnnotations('another-session').length, 0)
  assert.equal(fresh.api.listAnnotations('test')[0].number, 1)
  assert.equal(add(fresh.api).number, 2)
})
test('deleting a comment clears its tab cache and fresh bundles reject its old ref', async () => {
  const { api, storage } = load(); const item = add(api)
  api.removeAnnotation('test', item.id)
  assert.equal(storage.length, 0)
  await assert.rejects(load(storage).api.createSelectionCommentSource().codec.serialize(item.ref), /unavailable/)
})
test('bad storage versions and invalid records do not create usable references', async () => {
  const storage = memoryStorage()
  storage.setItem('dsh-selection-comments:v1:test', JSON.stringify({ version: 1, sessionId: 'test', annotations: [{ id: 'bad', ref: 'bad', number: '1', quote: 'x', note: 'x' }] }))
  const { api } = load(storage)
  assert.equal(api.listAnnotations('test').length, 0)
  await assert.rejects(api.createSelectionCommentSource().codec.serialize('bad'), /unavailable/)
})
test('quota failure removes a known stale cache instead of restoring an old edited note', async () => {
  const { api, storage } = load(); const item = add(api)
  storage.setItem = () => { throw new Error('quota') }
  api.updateAnnotation('test', item.id, { note: 'Changed in memory only' })
  assert.equal(api.cacheErrors.has('test'), true)
  assert.equal(storage.length, 0)
  assert.match(await api.createSelectionCommentSource().codec.serialize(item.ref), /Changed in memory only/)
  await assert.rejects(load(storage).api.createSelectionCommentSource().codec.serialize(item.ref), /unavailable/)
})
test('unavailable tab storage keeps memory usable but explicitly records the recovery limitation', async () => {
  const { api } = load(null); const item = add(api)
  assert.equal(api.cacheErrors.has('test'), true)
  assert.match(await api.createSelectionCommentSource().codec.serialize(item.ref), /Synthetic comment/)
})
test('all repeated occurrences are deleted while later foreign reference offsets remain valid', () => {
  const { api } = load(); const item = add(api); const token = item.clipboardText
  const draft = `${token} / @file / ${token} @last`
  const refs = [
    { source: 'selection-comment', ref: item.ref, offset: 0, length: token.length },
    { source: 'file', ref: 'f', offset: token.length + 3, length: 5 },
    { source: 'selection-comment', ref: item.ref, offset: token.length + 11, length: token.length },
    { source: 'file', ref: 'last', offset: draft.length - 5, length: 5 },
  ]
  const next = api.removeAnnotationToken({ draft, occurrences: refs }, item.ref)
  assert.equal(next.text, ' / @file /  @last')
  assert.deepEqual(next.references.map(r => next.text.slice(r.offset, r.offset + r.length)), ['@file', '@last'])
})
test('overlapping foreign references and invalid target offsets fail without mutating input', () => {
  const { api } = load(); const item = add(api); const token = item.clipboardText
  const input = { draft: token, occurrences: [{ source: 'selection-comment', ref: item.ref, offset: 0, length: token.length }, { source: 'file', ref: 'overlap', offset: 1, length: 2 }] }
  const before = JSON.stringify(input)
  assert.throws(() => api.removeAnnotationToken(input, item.ref), /offsets/)
  assert.equal(JSON.stringify(input), before)
  input.occurrences = [{ source: 'selection-comment', ref: item.ref, offset: -1, length: 2 }]
  assert.throws(() => api.removeAnnotationToken(input, item.ref), /offsets/)
})
test('append does not trim existing whitespace or invalidate prior file references', () => {
  const { api } = load(); const item = add(api)
  const input = { draft: '@file   ', occurrences: [{ source: 'file', ref: 'f', offset: 0, length: 5 }] }
  const next = api.appendAnnotationToken(input, item)
  assert.ok(next.text.startsWith('@file   \n\n'))
  assert.equal(next.references[0].offset, 0)
})
test('unknown refs fail closed, cancellation is respected, and no bare token is serialized', async () => {
  const { api } = load(); const item = add(api); const source = api.createSelectionCommentSource()
  await assert.rejects(source.codec.serialize('missing'), /unavailable/)
  const aborted = new AbortController(); aborted.abort(new Error('cancelled by test'))
  await assert.rejects(source.codec.serialize(item.ref, aborted.signal), /cancelled by test/)
})
test('comment size limits are enforced before numbering or storing', () => {
  const { api } = load()
  assert.throws(() => api.addAnnotation('test', { quote: 'x'.repeat(20001), note: 'note' }), /20,000/)
  assert.equal(add(api).number, 1)
})
test('ambiguous transcript ownership fails closed instead of choosing the first pane', () => {
  const { api } = load(memoryStorage(), { querySelectorAll: () => [{}, {}] })
  assert.equal(api.uniqueTranscript(), null)
  const body = {}; const parent = { parentElement: body, querySelectorAll: () => [{}, {}] }
  assert.equal(api.transcriptForSeat({ parentElement: parent }), null)
})
test('selection eligibility is constrained to the owning transcript root', () => {
  const { api } = load()
  const element = { nodeType: 1, closest(selector) { return selector.includes('data-composer') ? null : {} } }
  assert.equal(api.isEligibleSelectionElement(element, null), false)
  assert.equal(api.isEligibleSelectionElement(element, { contains: () => false }), false)
  assert.equal(api.isEligibleSelectionElement(element, { contains: () => true }), true)
})
test('submission state uses tentative submitted wording rather than a delivery receipt', () => {
  const { api } = load(); const item = add(api)
  api.syncAnnotationStatuses('test', { phase: 'submitting', draft: '', occurrences: [] })
  assert.equal(api.listAnnotations('test')[0].status, 'submitted')
  assert.match(api.t('submittedDescription'), /not confirmed/)
})
