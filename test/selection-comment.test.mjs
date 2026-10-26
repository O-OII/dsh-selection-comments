import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import * as host from '../index.mjs'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const bundleSource = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

/**
 * Evaluate the production browser bundle in a tiny loader shim so its helper
 * exports can be tested without a real browser.
 * @returns {Record<string, any>} bundle exports.
 */
function loadBundle() {
  let definition
  const context = vm.createContext({
    console,
    crypto: globalThis.crypto,
    window: {
      __ModuleLoader__: {
        load(value) {
          definition = value
        },
      },
    },
  })
  new vm.Script(bundleSource, { filename: 'client.js' }).runInContext(context)
  assert.ok(definition, 'bundle must register with window.__ModuleLoader__')
  const plugin = definition.factory((id) => {
    if (id === 'react') {
      return {
        createElement() {},
        useEffect() {},
        useRef() {},
      }
    }
    throw new Error(`unexpected external module: ${id}`)
  })
  assert.equal(plugin.__test.t('addTitle'), '添加注释')
  return plugin
}

/**
 * Build an isolated fake Cordis context for apply().
 * @param {Record<string, any>} plugin - loaded bundle.
 * @returns {{sources: any[], slots: any[], disposers: Function[]}} captured registrations.
 */
function mountPlugin(plugin) {
  const sources = []
  const slots = []
  const disposers = []
  const ctx = {
    inputTriggers: {
      registerSource(source) {
        sources.push(source)
        return () => {
          const at = sources.indexOf(source)
          if (at >= 0) sources.splice(at, 1)
        }
      },
    },
    slots: {
      inject(name, callback) {
        callback()
      },
      register(options, component) {
        slots.push({ options, component })
        return () => {}
      },
    },
    effect(callback) {
      const dispose = callback()
      disposers.push(dispose)
      return dispose
    },
  }
  plugin.apply(ctx)
  return { sources, slots, disposers }
}

test('host half imports without side effects', () => {
  assert.equal(host.name, 'selection-comments')
  assert.equal(typeof host.apply, 'function')
})

test('package and bundle identities line up for the DSH client scanner', () => {
  assert.equal(packageJson.name, '@o-oii/dsh-selection-comments')
  assert.equal(packageJson.version, '0.3.1')
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
  assert.equal(lock.version, packageJson.version)
  assert.equal(lock.packages[''].version, packageJson.version)
  assert.equal(packageJson.dsh.client.platform, 'web')
  assert.ok(packageJson.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-conversation'))
  assert.ok(packageJson.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-input-trigger'))
  assert.equal(packageJson.exports['./client'], './lib/client.js')
  assert.match(bundleSource, /id:\s*"@o-oii\/dsh-selection-comments"/)
})

test('apply registers one inputTriggers codec and the overlay without a composer footer status', () => {
  const plugin = loadBundle()
  assert.deepEqual(Array.from(plugin.inject), ['slots', 'inputTriggers'])
  const { sources, slots } = mountPlugin(plugin)
  assert.equal(sources.length, 1)
  assert.equal(sources[0].trigger, '@')
  assert.equal(sources[0].name, 'selection-comment')
  assert.equal(typeof sources[0].codec.serialize, 'function')
  assert.deepEqual(slots.map((entry) => entry.options.name), ['conversation.input.dock'])
  assert.equal(slots.some((entry) => entry.options.name === 'conversation.composer.dock'), false)
  assert.equal(slots[0].options.id, 'selection-comment')
  assert.equal(typeof slots[0].component, 'function')
})

test('the registered source contributes no @ menu rows and rejects unknown refs', async () => {
  const { __test } = loadBundle()
  const source = __test.createSelectionCommentSource()
  const candidates = await source.candidates()
  assert.equal(candidates.length, 0)
  await assert.rejects(source.codec.serialize('missing-ref'), /当前标签页/)
})

test('annotation codec serializes escaped quote and note and follows edits', async () => {
  const { __test } = loadBundle()
  const sessionId = 'unit-codec-session'
  const annotation = __test.addAnnotation(sessionId, {
    quote: 'if (a < b) { return "x" }',
    note: 'Check <script> & "quotes".',
    anchor: { blockKey: 'assistant:1:0', quote: 'if (a < b) { return "x" }' },
  })
  const source = __test.createSelectionCommentSource()
  const first = await source.codec.serialize(annotation.ref)
  assert.equal(
    first,
    '<selection_comment index="1">\n' +
      '<quote>if (a &lt; b) { return "x" }</quote>\n' +
      '<note>Check &lt;script&gt; &amp; "quotes".</note>\n' +
      '</selection_comment>',
  )
  __test.updateAnnotation(sessionId, annotation.id, { note: 'Revised note' })
  const second = await source.codec.serialize(annotation.ref)
  assert.match(second, /<note>Revised note<\/note>/)
  assert.equal(source.codec.clipboardText(annotation.ref), '[Comment1]')
})

test('semantic draft append keeps existing file references and adds only a compact token', () => {
  const { __test } = loadBundle()
  const annotation = __test.addAnnotation('unit-draft-session', {
    quote: 'The quick brown fox jumps over the lazy dog.',
    note: 'Why does this matter?',
    anchor: null,
  })
  const input = {
    phase: 'plain',
    draft: 'existing draft @src/app.ts',
    occurrences: [
      {
        source: 'reference',
        ref: '@src/app.ts',
        offset: 15,
        length: 11,
        label: 'app.ts',
        appearance: 'file',
        clipboardText: '@src/app.ts',
      },
    ],
  }
  const next = __test.appendAnnotationToken(input, annotation)
  assert.equal(next.text, 'existing draft @src/app.ts\n\n[Comment1]')
  assert.equal(next.references.length, 2)
  assert.deepEqual(JSON.parse(JSON.stringify(next.references[0])), {
    source: 'reference',
    ref: '@src/app.ts',
    offset: 15,
    length: 11,
    label: 'app.ts',
    appearance: 'file',
    clipboardText: '@src/app.ts',
  })
  assert.deepEqual(JSON.parse(JSON.stringify(next.references[1])), {
    source: 'selection-comment',
    ref: annotation.ref,
    offset: next.text.length - 10,
    length: 10,
    label: '注释 1',
    clipboardText: '[Comment1]',
  })
  assert.ok(!next.text.includes('quick brown fox'))
  assert.ok(!next.text.includes('Why does this matter?'))
  assert.equal(__test.appendAnnotationToken({ ...input, draft: next.text, occurrences: next.references }, annotation), null)
})

test('semantic draft removal deletes one token and shifts later reference offsets', () => {
  const { __test } = loadBundle()
  const first = __test.addAnnotation('unit-remove-session', { quote: 'first', note: 'one', anchor: null })
  const second = __test.addAnnotation('unit-remove-session', { quote: 'second', note: 'two', anchor: null })
  let input = { phase: 'plain', draft: 'draft', occurrences: [] }
  input = __test.appendAnnotationToken(input, first)
  input = __test.appendAnnotationToken(input, second)
  assert.equal(input.text, 'draft\n\n[Comment1]\n\n[Comment2]')
  const next = __test.removeAnnotationToken(input, first.ref)
  assert.equal(next.text, 'draft\n\n[Comment2]')
  assert.equal(next.references.length, 1)
  assert.equal(next.references[0].ref, second.ref)
  assert.equal(next.text.slice(next.references[0].offset, next.references[0].offset + next.references[0].length), '[Comment2]')
  assert.equal(__test.removeAnnotationToken({ ...input, draft: next.text, occurrences: next.references }, first.ref), null)
})

test('semantic draft preserves a leading command token', () => {
  const { __test } = loadBundle()
  const annotation = __test.addAnnotation('unit-command-session', { quote: 'q', note: 'n', anchor: null })
  const input = { phase: 'claimed', draft: '/goal ship it', occurrences: [], claim: { token: '/goal ' } }
  const next = __test.appendAnnotationToken(input, annotation)
  assert.equal(next.text, '/goal ship it\n\n[Comment1]')
  assert.deepEqual(JSON.parse(JSON.stringify(next.command)), { token: '/goal ' })
  assert.equal(next.references[0].offset, next.text.length - 10)
})

test('compact composer status never includes quote or note text', () => {
  const { __test } = loadBundle()
  assert.equal(__test.composerStatusText(0, 0), '')
  assert.equal(__test.composerStatusText(1, 1), '1 条注释')
  assert.equal(__test.composerStatusText(2, 2), '2 条注释')
  assert.equal(__test.composerStatusText(2, 1), '1 / 2 条注释')
  assert.equal(__test.composerStatusText(2, 0, 2, 0), '2 条注释 · 已提交')
  assert.equal(__test.composerStatusText(2, 0, 0, 2), '2 条注释 · 未加入')
  assert.equal(__test.composerStatusText(2, 0, 1, 1), '2 条注释 · 待处理')
})

test('codec expansion contains full context while the synthetic draft stays compact', async () => {
  const { __test } = loadBundle()
  const sessionId = 'unit-submit-session'
  const first = __test.addAnnotation(sessionId, {
    quote: 'first selected line',
    note: 'first hidden requirement',
    anchor: null,
  })
  const second = __test.addAnnotation(sessionId, {
    quote: 'second selected line',
    note: 'second hidden requirement',
    anchor: null,
  })
  let input = { phase: 'plain', draft: 'Please address these.', occurrences: [] }
  input = __test.appendAnnotationToken(input, first)
  input = __test.appendAnnotationToken(input, second)
  assert.equal(input.text, 'Please address these.\n\n[Comment1]\n\n[Comment2]')
  assert.ok(!input.text.includes('first selected line'))
  assert.ok(!input.text.includes('first hidden requirement'))
  const source = __test.createSelectionCommentSource()
  const serialized = await Promise.all(input.references.map((reference) => source.codec.serialize(reference.ref)))
  const prompt = __test.expandComposerPrompt(input, (ref) => serialized[input.references.findIndex((item) => item.ref === ref)])
  assert.match(prompt, /Please address these\./)
  assert.match(prompt, /<quote>first selected line<\/quote>\n<note>first hidden requirement<\/note>/)
  assert.match(prompt, /<quote>second selected line<\/quote>\n<note>second hidden requirement<\/note>/)
  assert.ok(prompt.indexOf('first hidden requirement') < prompt.indexOf('second hidden requirement'))
})

test('status reconciliation distinguishes manual removal from tentative submission', () => {
  const { __test } = loadBundle()
  const sessionId = 'unit-status-session'
  const annotation = __test.addAnnotation(sessionId, { quote: 'q', note: 'n', anchor: null })
  const token = __test.appendAnnotationToken({ phase: 'plain', draft: '', occurrences: [] }, annotation)

  __test.syncAnnotationStatuses(sessionId, { phase: 'plain', draft: '', occurrences: [] })
  assert.equal(__test.listAnnotations(sessionId)[0].status, 'detached')

  __test.updateAnnotation(sessionId, annotation.id, { status: 'queued' })
  __test.syncAnnotationStatuses(sessionId, { phase: 'submitting', draft: '', occurrences: [] })
  assert.equal(__test.listAnnotations(sessionId)[0].status, 'submitted')

  __test.updateAnnotation(sessionId, annotation.id, { status: 'queued' })
  __test.syncAnnotationStatuses(sessionId, token)
  assert.equal(__test.listAnnotations(sessionId)[0].status, 'queued')

  __test.syncAnnotationStatuses(sessionId, { phase: 'plain', draft: '', occurrences: [] })
  assert.equal(__test.listAnnotations(sessionId)[0].status, 'detached')
})

test('selection eligibility excludes composer, status chip, outside-transcript, and non-chat nodes', () => {
  const { __test } = loadBundle()
  const fake = ({ composer = false, status = false, scroll = true, chat = true } = {}) => ({
    nodeType: 1,
    closest(selector) {
      if (selector.includes('data-selection-comment-status') && status) return {}
      if ((selector.includes('data-composer') || selector.includes('data-selection-comment-ui')) && composer) return {}
      if (selector.includes('data-conversation-scroll')) return scroll ? {} : null
      if (selector.includes('data-chat-flow')) return chat ? {} : null
      return null
    },
  })
  assert.equal(__test.isEligibleSelectionElement(fake()), true)
  assert.equal(__test.isEligibleSelectionElement(fake({ composer: true })), false)
  assert.equal(__test.isEligibleSelectionElement(fake({ status: true })), false)
  assert.equal(__test.isEligibleSelectionElement(fake({ scroll: false })), false)
  assert.equal(__test.isEligibleSelectionElement(fake({ chat: false })), false)
  assert.equal(__test.isEligibleSelectionElement(null), false)
})

test('floating button placement stays inside the viewport', () => {
  const { __test } = loadBundle()
  const button = { offsetWidth: 66, offsetHeight: 32, style: {} }
  __test.placeFloatingButton(button, { left: 100, top: 100, width: 20, height: 20, bottom: 120 }, { width: 800, height: 600 })
  assert.equal(button.style.left, '77px')
  assert.equal(button.style.top, '60px')

  __test.placeFloatingButton(button, { left: 0, top: 0, width: 10, height: 10, bottom: 10 }, { width: 800, height: 600 })
  assert.equal(button.style.left, '8px')
  assert.equal(button.style.top, '18px')

  __test.placeFloatingButton(button, { left: 1000, top: 500, width: 10, height: 10, bottom: 510 }, { width: 800, height: 600 })
  assert.equal(button.style.left, '726px')
  assert.equal(button.style.top, '460px')
})
