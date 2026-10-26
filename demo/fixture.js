// Public synthetic adapters. The React dock/overlay/codec are the shipped plugin code.
(() => {
  const h = React.createElement
  const params = new URLSearchParams(location.search)
  let language = params.get('lang') || 'zh-CN'
  const transcriptZh = /^zh/.test(language)
  const localeListeners = new Set(), disposers = [], sources = new Map()
  let Dock
  const locale = {
    getSnapshot: () => ({ active: language, locales: ['en', 'zh'], revision: 1 }),
    subscribe(fn) { localeListeners.add(fn); return () => localeListeners.delete(fn) },
  }
  const plugin = window.commentPlugin
  const api = plugin.__test
  const ctx = {
    inputTriggers: { registerSource(source) { sources.set(source.name, source); return () => sources.delete(source.name) } },
    slots: { inject(_name, fn) { fn() }, register(_metadata, component) { Dock = component; return () => {} } },
    effect(fn) { const off = fn(); if (typeof off === 'function') disposers.push(off); return off },
    inject(names, fn) { if (names[0] === 'locale') fn({ locale, effect: ctx.effect }) },
  }
  plugin.apply(ctx, { locale: params.get('locale') ?? undefined })
  function makeStore(id) {
    let state = { phase: 'plain', draft: '', occurrences: [] }
    const listeners = new Set(), calls = []
    const emit = () => { for (const fn of listeners) fn() }
    const store = {
      id, calls, get: () => state,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
      set(next) { state = { ...state, ...next }; emit() },
      actions: {
        setDraft(value) {
          if (['submitting', 'adjudicating'].includes(state.phase)) throw new Error('Synthetic input is busy')
          calls.push(value)
          state = { ...state, draft: typeof value === 'string' ? value : value.text, occurrences: typeof value === 'string' ? [] : value.references || [], claim: value.command }
          emit()
        },
      },
    }
    store.useInput = selector => selector(React.useSyncExternalStore(store.subscribe, store.get, store.get))
    return store
  }
  const stores = [makeStore('public-demo-A'), makeStore('public-demo-B')]
  const dual = params.get('dual') === '1'
  function Pane({ store, index }) {
    const input = React.useSyncExternalStore(store.subscribe, store.get, store.get)
    const [, redrawLocale] = React.useState(0)
    React.useEffect(() => { const fn = () => redrawLocale(n => n + 1); localeListeners.add(fn); return () => localeListeners.delete(fn) }, [])
    const zh = /^zh/.test(language)
    const [output, setOutput] = React.useState('')
    const submit = async () => {
      const serialized = new Map()
      for (const reference of input.occurrences) serialized.set(reference.ref, await sources.get(reference.source).codec.serialize(reference.ref))
      setOutput(api.expandComposerPrompt(input, ref => serialized.get(ref)))
      store.set({ phase: 'submitting', draft: '', occurrences: [] })
      setTimeout(() => store.set({ phase: 'plain' }), 60)
    }
    return h('section', { className: 'pane', 'data-demo-pane': store.id },
      h('div', { className: 'pane-head' }, h('span', { className: 'dot' }), zh ? `示例会话 ${index + 1}` : `Example conversation ${index + 1}`),
      h('div', { 'data-conversation-scroll': '' }, h('div', { 'data-chat-flow': '' },
        h('div', { 'data-chat-flow-kind': 'user', 'data-chat-turn': '1' }, h('div', { className: 'role' }, zh ? '你' : 'You'), h('p', { className: 'message user' }, zh ? '请帮我检查这个发布计划，重点关注可靠性。' : 'Review this release plan, with a focus on reliability.')),
        h('div', { 'data-chat-flow-kind': 'assistant', 'data-chat-turn': '1' }, h('div', { className: 'role' }, zh ? '助手' : 'Assistant'),
          h('p', { className: 'message', 'data-demo-selectable': 'main' }, transcriptZh ? '可靠的发布需要可重复的测试、明确的权限边界，以及出现问题时可执行的回滚方案。' : 'A reliable release needs repeatable tests, explicit permission boundaries, and a practical rollback plan.'),
          h('p', { className: 'message', 'data-demo-selectable': 'second' }, transcriptZh ? '说明哪些验证已完成，也要坦诚列出仍未验证的实际环境。' : 'Document what was verified, and be explicit about real environments that were not tested.'),
          h('pre', { className: 'code' }, 'check → test → review → release'),
        ),
      )),
      h('div', { className: 'composer', 'data-composer-seat': '' },
        h('div', { className: 'draft', 'data-composer-input': '' },
          input.occurrences.length ? input.occurrences.map(reference => h('button', { key: reference.ref, className: 'chip', onClick: () => sources.get(reference.source).openReference({ sessionId: store.id }, reference) }, reference.label)) : h('span', { style: { color: '#98a2b2' } }, zh ? '输入消息，或选中上面的原文添加注释…' : 'Write a message, or select a passage above…'),
        ),
        h('div', { 'data-composer-dock': '' }, h(Dock, { sessionId: store.id, inputActions: store.actions, useInput: store.useInput })),
        h('div', { className: 'composer-footer' }, h('span', null, zh ? '紧凑引用 · 提交时展开原文与注释' : 'Compact references · Quote + comment expand on submit'), h('button', { className: 'send', onClick: submit }, zh ? '预览提交内容' : 'Preview submitted context')),
        h('pre', { className: 'output', hidden: !output }, output),
      ),
    )
  }
  function App() { return h('div', { className: 'panes' + (dual ? ' dual' : '') }, stores.slice(0, dual ? 2 : 1).map((store, index) => h(Pane, { key: store.id, store, index }))) }
  ReactDOM.createRoot(document.getElementById('app')).render(h(App))
  const chromeText = () => {
    const zh = /^zh/.test(language)
    document.documentElement.lang = zh ? 'zh-CN' : 'en'
    document.getElementById('heading').textContent = zh ? '针对原文写注释，让输入框保持简洁。' : 'Comment on a passage. Keep your draft focused.'
    document.getElementById('intro').textContent = zh ? '选择原文 → 添加注释 → 查看紧凑引用 → 提交上下文。' : 'Select text → add a comment → review compact references → submit.'
    document.getElementById('seed').textContent = zh ? '展示示例' : 'Show example'
    document.getElementById('language').textContent = zh ? 'English' : '简体中文'
    document.getElementById('disclaimer').textContent = zh ? '交互夹具，不是运行中 DSH 会话的截图。' : 'Interactive fixture, not a screenshot of a running DSH session.'
    document.getElementById('evidence').textContent = zh ? '加载真实插件客户端和 React dock；正文、输入桥接和语言服务为合成适配，不请求模型。' : 'Uses the actual plugin bundle and React dock, with synthetic transcript/input/locale adapters. No model requests.'
  }
  const setLocale = value => { language = value; for (const fn of localeListeners) fn(); chromeText() }
  const select = (id, which = 'main', start = 0, end) => {
    const element = document.querySelector(`[data-demo-pane="${id}"] [data-demo-selectable="${which}"]`)
    const node = element.firstChild, range = document.createRange()
    range.setStart(node, start); range.setEnd(node, end ?? Math.min(node.length, start + 28))
    getSelection().removeAllRanges(); getSelection().addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    return { range, text: range.toString() }
  }
  const seed = () => {
    const store = stores[0]
    if (api.listAnnotations(store.id).length) return
    for (const [which, note] of [['main', /^zh/.test(language) ? '请补充可重复运行的测试步骤。' : 'Please add repeatable test steps.'], ['second', /^zh/.test(language) ? '标明真实环境与合成夹具的区别。' : 'Separate real-environment evidence from fixtures.']]) {
      const element = document.querySelector(`[data-demo-pane="${store.id}"] [data-demo-selectable="${which}"]`)
      const selected = select(store.id, which, 0, element.textContent.length)
      const annotation = api.addAnnotation(store.id, { quote: selected.text, note, anchor: api.captureAnchor(selected.range, selected.text) })
      store.actions.setDraft(api.appendAnnotationToken(store.get(), annotation))
    }
    getSelection().removeAllRanges()
  }
  window.commentDemo = { api, stores, sources, select, setLocale, seed, disposers }
  document.getElementById('seed').addEventListener('click', seed)
  document.getElementById('language').addEventListener('click', () => { api.setLocalePreference('auto'); setLocale(/^zh/.test(language) ? 'en' : 'zh-CN') })
  chromeText()
  if (params.get('seed') === '1') setTimeout(seed, 150)
})()
