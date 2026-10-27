import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { test } from 'node:test'

// Minimal DOM semantics for the exact public rc.3 attributes (not host React
// internals). This regression does not substitute for actual GUI acceptance.
class Element {
  constructor(attributes = {}) { this.attributes = new Map(Object.entries(attributes)); this.children = []; this.parentElement = null; this.nodeType = 1 }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node) } return this }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  matches(selector) { return selector.split(',').some(part => { const match = part.trim().match(/^\[([\w-]+)(?:="([^"]*)")?\]$/); return match && this.attributes.has(match[1]) && (match[2] === undefined || this.getAttribute(match[1]) === match[2]) }) }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null }
  contains(other) { for (let node = other; node; node = node.parentElement) if (node === this) return true; return false }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]) }
}
const node = (...attributes) => new Element(Object.fromEntries(attributes.map(attribute => [attribute, ''])))
function pane(body, sessionId = 'session-A', official = true) {
  const owner = new Element(official ? { 'data-conversation-content': '', 'data-conversation-session': sessionId } : {})
  const scroll = node('data-conversation-scroll'), flow = node('data-chat-flow')
  const group = node('data-chat-group-key'), nested = node('data-step-process-content', 'data-chat-flow'), text = node('data-chat-flow-kind')
  const composer = node('data-composer-seat'), seat = node('data-selection-comments-seat')
  body.append(owner); owner.append(scroll); scroll.append(flow, composer); flow.append(group); group.append(nested); nested.append(text); composer.append(seat)
  return { owner, scroll, flow, group, nested, text, composer, seat }
}
function load(body) {
  let definition
  vm.runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    document: { body, querySelectorAll: selector => body.querySelectorAll(selector) },
    window: { __ModuleLoader__: { load(value) { definition = value } } },
  })
  return definition.factory(id => { assert.equal(id, 'react'); return {} }).__test
}

test('rc.3 outer ChatView plus nested ChatGroupSeat flows are one transcript, not multiple panes', () => {
  const body = node(), a = pane(body), api = load(body)
  a.nested.append(node('data-chat-flow'))
  assert.equal(a.owner.querySelectorAll('[data-chat-flow]').length, 3, 'reproduces the raw-count rejection in 0.3.2')
  assert.equal(api.transcriptRootsWithin(a.owner, a.owner).length, 1)
  assert.equal(api.transcriptForSeat(a.seat, 'session-A'), a.flow)
  assert.equal(api.uniqueTranscript(), a.flow)
  assert.equal(api.isEligibleSelectionElement(a.text, a.flow), true)
})
test('nearest official occurrence and matching Session isolate multiple real-layout panes', () => {
  const body = node(), a = pane(body, 'A'), b = pane(body, 'B'), api = load(body)
  assert.equal(api.transcriptForSeat(a.seat, 'A'), a.flow)
  assert.equal(api.transcriptForSeat(b.seat, 'B'), b.flow)
  assert.equal(api.transcriptForSeat(a.seat, 'B'), null)
  assert.equal(api.isEligibleSelectionElement(b.text, a.flow), false)
  assert.equal(api.uniqueTranscript(), null)
})
test('embedded same-Session occurrences stay separate even when nested inside an outer flow', () => {
  const body = node(), a = pane(body, 'A'), b = pane(a.flow, 'A'), api = load(body)
  assert.equal(api.transcriptForSeat(a.seat, 'A'), a.flow)
  assert.equal(api.transcriptForSeat(b.seat, 'A'), b.flow)
  assert.equal(api.isEligibleSelectionElement(b.text, a.flow), false)
  assert.equal(api.isEligibleSelectionElement(a.text, b.flow), false)
  assert.equal(api.uniqueTranscript(), null, 'separate occurrence must not be mistaken for a process group')
})
test('an unrelated global flow does not suppress a proven official occurrence', () => {
  const body = node(), a = pane(body), api = load(body)
  body.append(node('data-chat-flow'))
  assert.equal(api.uniqueTranscript(), null)
  assert.equal(api.transcriptForSeat(a.seat, 'session-A'), a.flow)
})
test('parallel roots in one occurrence remain ambiguous and fail closed', () => {
  const body = node(), a = pane(body), api = load(body)
  a.scroll.append(node('data-chat-flow'))
  assert.equal(api.transcriptForSeat(a.seat, 'session-A'), null)
})
test('legacy layouts without occurrence attributes still accept nested groups and isolate siblings', () => {
  const body = node(), a = pane(body, 'A', false), b = pane(body, 'B', false), api = load(body)
  assert.equal(api.transcriptForSeat(a.seat, 'A'), a.flow)
  assert.equal(api.transcriptForSeat(b.seat, 'B'), b.flow)
  assert.equal(api.uniqueTranscript(), null)
})
test('composer elements remain excluded after widening flow ownership to nested process groups', () => {
  const body = node(), a = pane(body), api = load(body)
  assert.equal(api.isEligibleSelectionElement(a.seat, a.flow), false)
  assert.equal(api.isEligibleSelectionElement(a.text, null), false)
})

test('supplied official rc.3 bundles actually declare outer and grouped flows plus occurrence identity', { skip: !process.env.DSH_CONVERSATION_BUNDLE }, () => {
  const conversation = readFileSync(process.env.DSH_CONVERSATION_BUNDLE, 'utf8')
  const chat = readFileSync(path.resolve(path.dirname(process.env.DSH_CONVERSATION_BUNDLE), '../../dsh-client-ui-chat/lib/client.js'), 'utf8')
  assert.match(conversation, /"data-conversation-content": ""[\s\S]{0,160}"data-conversation-session": sessionId/)
  assert.match(conversation, /"data-conversation-scroll": ""/)
  assert.match(chat, /className: ChatView_module_css_default\.column,[\s\S]{0,60}"data-chat-flow": ""/)
  assert.match(chat, /"data-step-process-content": true,[\s\S]{0,60}"data-chat-flow": ""/)
})
