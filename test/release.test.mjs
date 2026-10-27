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
    console, crypto: globalThis.crypto, document, navigator: { language: 'en-US', languages: ['en-US'] },
    window: { sessionStorage: storage, __ModuleLoader__: { load: value => { definition = value } } },
  })
  const plugin = definition.factory(id => {
    assert.equal(id, 'react')
    return { createElement() {}, useEffect() {}, useRef() {}, useState() {} }
  })
  return { api: plugin.__test, plugin, storage }
}
const add = (api, session = 'test') => api.addAnnotation(session, { quote: 'Synthetic quote <unsafe>', note: 'Synthetic comment & detail', anchor: null })

function localeService(active = 'en-US') {
  const listeners = new Set()
  return {
    getSnapshot: () => ({ active }),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    set(value) { active = value; for (const fn of listeners) fn() },
    get subscribers() { return listeners.size },
  }
}

test('Simplified Chinese is deterministic before mounting, independent of an English browser', () => {
  const { api } = load()
  assert.equal(api.getLocalePreference(), 'zh-CN')
  assert.equal(api.t('addTitle'), '添加注释')
  assert.equal(add(api).label, '注释 1')
  assert.equal(api.t('not-a-key'), 'not-a-key')
})
test('default preference stays Chinese even when the DSH locale service is English', () => {
  const { api } = load(), service = localeService()
  const off = api.attachLocale(service)
  assert.equal(api.t('save'), '保存')
  service.set('en'); assert.equal(api.t('save'), '保存')
  off(); assert.equal(service.subscribers, 0)
})
test('explicit English overrides host changes and a fresh bundle returns to Chinese', () => {
  const { api } = load(), service = localeService('zh-CN')
  const off = api.attachLocale(service)
  api.setLocalePreference('en'); assert.equal(api.getLocalePreference(), 'en')
  assert.equal(api.t('addTitle'), 'Add comment')
  service.set('fr'); assert.equal(api.t('addTitle'), 'Add comment')
  off(); assert.equal(api.t('save'), 'Save')
  assert.equal(load().api.t('addTitle'), '添加注释')
})
test('auto follows DSH locale changes, including English and Chinese variants, and disposes', () => {
  const { api } = load(), service = localeService('en-US')
  api.setLocalePreference('auto'); assert.equal(api.t('save'), '保存')
  const off = api.attachLocale(service)
  assert.equal(api.t('save'), 'Save')
  service.set('zh-Hant'); assert.equal(api.t('save'), '保存')
  service.set('en_GB'); assert.equal(api.t('save'), 'Save')
  api.setLocalePreference('zh-CN'); assert.equal(api.t('save'), '保存')
  service.set('en'); assert.equal(api.t('save'), '保存')
  api.setLocalePreference('auto'); assert.equal(api.t('save'), 'Save')
  off(); assert.equal(service.subscribers, 0); assert.equal(api.t('save'), '保存')
})
test('auto without a service, empty snapshots and unsupported locales fall back to Chinese', () => {
  const { api } = load()
  api.setLocalePreference('auto')
  api.attachLocale(); assert.equal(api.t('addTitle'), '添加注释')
  api.attachLocale({ getSnapshot: () => ({}) }); assert.equal(api.t('save'), '保存')
  const service = localeService('en'); const off = api.attachLocale(service)
  for (const value of ['fr-FR', '', null, undefined, 'english']) {
    service.set(value); assert.equal(api.t('save'), '保存', String(value))
  }
  off()
})
test('unsupported preferences reset to Chinese and locale-only updates notify only on changes', () => {
  const { api } = load(); let calls = 0
  const off = api.subscribeLocale(() => { calls++ })
  api.setLocalePreference('en'); api.setLocalePreference('en-US')
  assert.equal(calls, 1)
  api.setLocalePreference('fr'); assert.equal(api.getLocalePreference(), 'zh-CN')
  assert.equal(api.t('save'), '保存'); assert.equal(calls, 2)
  for (const value of [undefined, null, '', 'zh', 'zh-CN', 'zh-Hant']) api.setLocalePreference(value)
  assert.equal(calls, 2)
  off(); api.setLocalePreference('en'); assert.equal(calls, 2)
})
test('client apply accepts default, explicit English and auto composition config without a host service', () => {
  for (const [config, expected, preference] of [[undefined, '保存', 'zh-CN'], [null, '保存', 'zh-CN'], [{ locale: 'en' }, 'Save', 'en'], [{ locale: 'auto' }, '保存', 'auto'], [{ locale: 'fr' }, '保存', 'zh-CN']]) {
    const { plugin, api } = load()
    const ctx = {
      effect(fn) { return fn() },
      inputTriggers: { registerSource() { return () => {} } },
      slots: { inject(_name, fn) { fn() }, register() {} },
    }
    plugin.apply(ctx, config)
    assert.equal(plugin.getLocalePreference(), preference)
    assert.equal(api.t('save'), expected)
  }
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
test('reference identity, clipboard token and XML context do not depend on locale', async () => {
  const { api } = load(); const item = add(api)
  const source = api.createSelectionCommentSource(); const before = await source.codec.serialize(item.ref)
  api.setLocalePreference('en')
  assert.equal(source.codec.clipboardText(item.ref), '[Comment1]')
  assert.equal(await source.codec.serialize(item.ref), before)
  assert.match(before, /&lt;unsafe&gt;/); assert.match(before, /&amp; detail/)
})
test('preference-only changes notify selectors when the resolved UI stays Chinese', () => {
  const { api } = load(); let calls = 0
  const off = api.subscribeLocale(() => { calls++ })
  api.setLocalePreference('auto'); assert.equal(calls, 1)
  api.setLocalePreference('zh-CN'); assert.equal(calls, 2)
  off()
})
test('locale-only draft metadata update preserves text, offsets, other sources and command', () => {
  const { api } = load(); api.setLocalePreference('en'); const item = add(api)
  let input = api.appendAnnotationToken({ draft: '/cmd @file  ', claim: { token: '/cmd ' }, occurrences: [{ source: 'file', ref: 'f', offset: 5, length: 5, label: 'file', clipboardText: '@file' }] }, item)
  const before = plain(input); api.setLocalePreference('zh-CN')
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
  await assert.rejects(load(storage).api.createSelectionCommentSource().codec.serialize(item.ref), /当前标签页/)
})
test('bad storage versions and invalid records do not create usable references', async () => {
  const storage = memoryStorage()
  storage.setItem('dsh-selection-comments:v1:test', JSON.stringify({ version: 1, sessionId: 'test', annotations: [{ id: 'bad', ref: 'bad', number: '1', quote: 'x', note: 'x' }] }))
  const { api } = load(storage)
  assert.equal(api.listAnnotations('test').length, 0)
  await assert.rejects(api.createSelectionCommentSource().codec.serialize('bad'), /当前标签页/)
})
test('quota failure removes a known stale cache instead of restoring an old edited note', async () => {
  const { api, storage } = load(); const item = add(api)
  storage.setItem = () => { throw new Error('quota') }
  api.updateAnnotation('test', item.id, { note: 'Changed in memory only' })
  assert.equal(api.cacheErrors.has('test'), true)
  assert.equal(storage.length, 0)
  assert.match(await api.createSelectionCommentSource().codec.serialize(item.ref), /Changed in memory only/)
  await assert.rejects(load(storage).api.createSelectionCommentSource().codec.serialize(item.ref), /当前标签页/)
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
  assert.throws(() => api.removeAnnotationToken(input, item.ref), /文本偏移/)
  assert.equal(JSON.stringify(input), before)
  input.occurrences = [{ source: 'selection-comment', ref: item.ref, offset: -1, length: 2 }]
  assert.throws(() => api.removeAnnotationToken(input, item.ref), /文本偏移/)
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
  await assert.rejects(source.codec.serialize('missing'), /当前标签页/)
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
  const element = { nodeType: 1, closest(selector) { return selector.includes('data-composer') || selector === '[data-conversation-content]' ? null : {} } }
  assert.equal(api.isEligibleSelectionElement(element, null), false)
  assert.equal(api.isEligibleSelectionElement(element, { contains: () => false }), false)
  assert.equal(api.isEligibleSelectionElement(element, { contains: () => true }), true)
})
test('submission state uses tentative submitted wording rather than a delivery receipt', () => {
  const { api } = load(); const item = add(api)
  api.syncAnnotationStatuses('test', { phase: 'submitting', draft: '', occurrences: [] })
  assert.equal(api.listAnnotations('test')[0].status, 'submitted')
  assert.match(api.t('submittedDescription'), /不确认送达/)
})
