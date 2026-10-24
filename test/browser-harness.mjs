/**
 * Execute the real client bundle in headless Chrome against a synthetic DSH
 * transcript. Start Chrome with a CDP port first, then run:
 *
 *   node test/browser-harness.mjs
 *
 * The default port is 9333. `CDP_PORT` overrides it.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const port = process.env.CDP_PORT || '9333'
const harness = pathToFileURL(resolve('test/harness.html')).href

const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(harness)}`, {
  method: 'PUT',
}).then(async (response) => {
  if (!response.ok) throw new Error(`cannot create CDP page: HTTP ${response.status}`)
  return response.json()
})

const socket = new WebSocket(created.webSocketDebuggerUrl)
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener('open', resolveOpen, { once: true })
  socket.addEventListener('error', rejectOpen, { once: true })
})

let nextId = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id === undefined) return
  const entry = pending.get(message.id)
  if (!entry) return
  pending.delete(message.id)
  if (message.error) entry.reject(new Error(message.error.message))
  else entry.resolve(message.result)
})

/**
 * Send one CDP command.
 * @param {string} method - protocol method.
 * @param {Record<string, unknown>} [params] - method params.
 * @returns {Promise<any>} protocol result.
 */
function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolveSend, rejectSend) => {
    pending.set(id, { resolve: resolveSend, reject: rejectSend })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

try {
  await send('Runtime.enable')
  await send('Page.enable')

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true })
    if (state.result.value === 'complete') break
    await new Promise((resolveWait) => setTimeout(resolveWait, 50))
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const ready = await send('Runtime.evaluate', {
      expression: 'Boolean(window.__selectionCommentPlugin && window.__status && window.__overlay)',
      returnByValue: true,
    })
    if (ready.result.value === true) break
    await new Promise((resolveWait) => setTimeout(resolveWait, 50))
  }

  const evaluated = await send('Runtime.evaluate', {
    expression: `(async () => {
      const sleep = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
      const plugin = window.__selectionCommentPlugin;
      if (!plugin) throw new Error('bundle did not install __selectionCommentPlugin');
      const api = plugin.__test;
      const results = [];
      const check = (name, condition, detail) => {
        results.push({ name, pass: Boolean(condition), detail: detail ?? null });
        if (!condition) throw new Error(name + (detail ? ': ' + detail : ''));
      };
      const getHost = () => document.querySelector('[data-selection-comment-ui]');
      const getShadow = () => {
        const host = getHost();
        if (!host) throw new Error('overlay host missing');
        return host.shadowRoot;
      };
      const dialog = () => getShadow().querySelector('.sc-dialog');
      const backdrop = () => getShadow().querySelector('.sc-backdrop');
      const note = () => getShadow().querySelector('.sc-note');
      const action = (name) => getShadow().querySelector('[data-sc-action="' + name + '"]');
      const badges = () => [...getShadow().querySelectorAll('[data-sc-badge]')].filter((badge) => !badge.hidden);
      const allBadges = () => [...getShadow().querySelectorAll('[data-sc-badge]')];
      const statusButton = () => window.__status.element.shadowRoot.querySelector('.sc-status');
      const statusText = () => statusButton().hidden ? '' : window.__status.element.shadowRoot.querySelector('.sc-status-label').textContent.trim();
      const statusVisibility = () => {
        const host = window.__status.element;
        const button = statusButton();
        const hostStyle = getComputedStyle(host);
        const buttonStyle = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return {
          visible: hostStyle.display !== 'none' && buttonStyle.display !== 'none' && buttonStyle.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
          hostDisplay: hostStyle.display,
          buttonDisplay: buttonStyle.display,
          width: rect.width,
          height: rect.height,
        };
      };
      const statusStyle = () => {
        const button = statusButton();
        const style = getComputedStyle(button);
        const label = getComputedStyle(button.querySelector('.sc-status-label'));
        const icon = button.querySelector('.sc-status-icon').getBoundingClientRect();
        return {
          borderWidths: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
          borderRadius: style.borderRadius, background: style.backgroundColor, shadow: style.boxShadow,
          fontSize: label.fontSize, fontWeight: label.fontWeight, lineHeight: label.lineHeight,
          height: button.getBoundingClientRect().height, gap: style.columnGap,
          iconWidth: icon.width, iconHeight: icon.height, color: style.color,
        };
      };
      const isUnboxed = (style) => style.borderWidths.every((width) => width === '0px') && style.background === 'rgba(0, 0, 0, 0)' && style.shadow === 'none';
      const composerText = () => document.getElementById('composer-text').textContent;
      const selectText = (id, start, end) => {
        const node = document.getElementById(id).firstChild;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return range;
      };
      const clearSelection = () => {
        window.getSelection().removeAllRanges();
        document.dispatchEvent(new Event('selectionchange'));
      };
      const selectionRect = (id, start, end) => {
        const node = document.getElementById(id).firstChild;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        return range.getBoundingClientRect();
      };
      const annotationById = (id) => api.listAnnotations('synthetic-session-A').find((item) => item.id === id);
      const serializeAll = async () => {
        const refs = window.__input.occurrences.filter((occurrence) => occurrence.source === 'selection-comment');
        const parts = await Promise.all(refs.map((occurrence) => window.__source.codec.serialize(occurrence.ref)));
        const prompt = api.expandComposerPrompt(window.__input, (ref) => {
          const index = refs.findIndex((occurrence) => occurrence.ref === ref);
          return parts[index];
        });
        return { refs, parts, prompt };
      };
      const addAnnotation = async (id, start, end, text) => {
        selectText(id, start, end);
        await sleep(60);
        getShadow().querySelector('.sc-button').click();
        await sleep(40);
        check('dialog opens for ' + id, backdrop().hidden === false);
        note().value = text;
        action('save').click();
        await sleep(80);
      };

      check('button starts hidden', getShadow().querySelector('.sc-button').hidden === true);
      check('status starts empty', statusText() === '', JSON.stringify(statusText()));
      const initialStatus = statusVisibility();
      check('zero-annotation status chip is really invisible', initialStatus.visible === false, JSON.stringify(initialStatus));
      check('zero-annotation status host and button compute display none', initialStatus.hostDisplay === 'none' && initialStatus.buttonDisplay === 'none', JSON.stringify(initialStatus));

      const assistantText = document.getElementById('assistant-message').textContent;
      const codeText = document.getElementById('code-message').textContent;
      await addAnnotation('assistant-message', 4, 19, 'First requirement');
      const first = api.listAnnotations('synthetic-session-A')[0];
      check('first annotation exists', first !== undefined);
      check('first draft call is semantic', window.__setDraftCalls.length === 1 && typeof window.__setDraftCalls[0] === 'object');
      check('draft contains only compact token', window.__input.draft === 'existing draft\\n\\n[Comment1]', JSON.stringify(window.__input.draft));
      check('draft excludes quote', !window.__input.draft.includes('quick brown fox'));
      check('draft excludes note', !window.__input.draft.includes('First requirement'));
      check('composer shows only compact text', composerText() === 'existing draft\\n\\n[Comment1]', JSON.stringify(composerText()));
      check('semantic reference exists', window.__input.occurrences.length === 1 && window.__input.occurrences[0].source === 'selection-comment');
      check('one numbered badge', badges().length === 1 && badges()[0].textContent === '1', String(badges().length));
      check('status reads one annotation', statusText() === '1 条注释', statusText());
      const oneStatus = statusVisibility();
      const oneIcon = statusButton().querySelector('svg.sc-status-icon');
      check('one-annotation status is visible', oneStatus.visible === true, JSON.stringify(oneStatus));
      check('one-annotation status stays a native button', statusButton().tagName === 'BUTTON' && statusButton().type === 'button');
      const inlineStyle = statusStyle();
      check('status uses a 12-13px line SVG icon', oneIcon !== null && oneIcon.getAttribute('viewBox') === '0 0 16 16' && inlineStyle.iconWidth >= 12 && inlineStyle.iconWidth <= 13 && inlineStyle.iconHeight === inlineStyle.iconWidth && [...oneIcon.querySelectorAll('path')].every((path) => path.getAttribute('fill') === 'none' && path.getAttribute('stroke') === 'currentColor'), JSON.stringify(inlineStyle));
      check('status icon is decorative', oneIcon !== null && oneIcon.getAttribute('aria-hidden') === 'true' && oneIcon.getAttribute('focusable') === 'false');
      check('status has no border, background or shadow', isUnboxed(inlineStyle), JSON.stringify(inlineStyle));
      check('status does not have pill corners', inlineStyle.borderRadius === '0px', JSON.stringify(inlineStyle));
      check('status label is regular 12px footer text', inlineStyle.fontSize === '12px' && inlineStyle.fontWeight === '400', JSON.stringify(inlineStyle));
      check('status line height stays 18-20px', parseFloat(inlineStyle.lineHeight) >= 18 && parseFloat(inlineStyle.lineHeight) <= 20, JSON.stringify(inlineStyle));
      check('status height stays 20-22px', inlineStyle.height >= 20 && inlineStyle.height <= 22, JSON.stringify(inlineStyle));
      check('status icon-label gap stays 4-5px', parseFloat(inlineStyle.gap) >= 4 && parseFloat(inlineStyle.gap) <= 5, JSON.stringify(inlineStyle));
      check('status keeps its title and accessible name', Boolean(statusButton().title) && statusButton().getAttribute('aria-label') === statusButton().title);
      window.__status.element.style.setProperty('--dsw-alias-label-tertiary', 'rgb(121, 130, 143)');
      await sleep(150);
      check('status inherits the DSH label token', statusStyle().color === 'rgb(121, 130, 143)', JSON.stringify(statusStyle()));
      window.__status.element.style.removeProperty('--dsw-alias-label-tertiary');
      const firstTextRect = selectionRect('assistant-message', 4, 19);
      const firstBadgeRect = badges()[0].getBoundingClientRect();
      check('badge sits near annotated text', Math.abs(firstBadgeRect.top - firstTextRect.top) < 60 && firstBadgeRect.left >= firstTextRect.right - 2, JSON.stringify({ badge: firstBadgeRect.toJSON(), text: firstTextRect.toJSON() }));
      clearSelection();
      await sleep(30);

      await addAnnotation('code-message', 0, codeText.length, 'Second requirement');
      check('two annotations in store', api.listAnnotations('synthetic-session-A').length === 2);
      check('two semantic references', window.__input.occurrences.length === 2);
      check('draft still has no quote or note', !window.__input.draft.includes('quick brown fox') && !window.__input.draft.includes('Second requirement'));
      check('two badges rendered', badges().length === 2, String(badges().length));
      check('status reads two annotations', statusText() === '2 条注释', statusText());
      check('two-annotation status stays visible', statusVisibility().visible === true, JSON.stringify(statusVisibility()));
      clearSelection();
      await sleep(30);

      statusButton().click();
      await sleep(60);
      check('status click opens annotation list', backdrop().hidden === false && !getShadow().querySelector('.sc-list').hidden);
      const rows = [...getShadow().querySelectorAll('[data-sc-action="edit-row"]')];
      check('list has two rows', rows.length === 2, String(rows.length));
      rows[0].click();
      await sleep(50);
      check('list row opens editor', dialog().querySelector('.sc-title').textContent === '编辑注释 #1', dialog().querySelector('.sc-title').textContent);
      note().value = 'Edited first requirement';
      action('save').click();
      await sleep(70);
      const firstEdited = annotationById(first.id);
      check('edit saves note', firstEdited.note === 'Edited first requirement', firstEdited.note);
      check('edit keeps token after save', window.__input.draft.includes('[Comment1]'));
      check('edit does not add quote to draft', !window.__input.draft.includes('quick brown fox'));

      const beforeSend = await serializeAll();
      check('send expands both annotations', beforeSend.prompt.includes('<quote>quick brown fox</quote>') && beforeSend.prompt.includes('<quote>' + codeText + '</quote>'), beforeSend.prompt);
      check('send includes edited first note', beforeSend.prompt.includes('<note>Edited first requirement</note>'), beforeSend.prompt);
      check('send includes second note', beforeSend.prompt.includes('<note>Second requirement</note>'), beforeSend.prompt);
      check('send output differs from visible draft', !window.__input.draft.includes('<selection_comment') && beforeSend.prompt.includes('<selection_comment index="1">'));

      const scroll = document.querySelector('[data-conversation-scroll]');
      const beforeTop = badges()[0]?.getBoundingClientRect().top ?? null;
      scroll.scrollTop = 36;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      await sleep(100);
      const badgesAfterScroll = badges();
      const afterTop = badgesAfterScroll[0]?.getBoundingClientRect().top ?? null;
      check('badges survive scroll or hide outside viewport', badgesAfterScroll.length === 0 || beforeTop !== afterTop, JSON.stringify({ beforeTop, afterTop, count: badgesAfterScroll.length }));
      scroll.scrollTop = 0;
      scroll.dispatchEvent(new Event('scroll', { bubbles: true }));
      await sleep(100);

      const assistant = document.getElementById('assistant-message');
      assistant.textContent = assistantText;
      await sleep(120);
      check('badges survive transcript re-render', badges().length === 2, String(badges().length));

      window.__harness.disposeOverlay();
      await sleep(30);
      check('disposing overlay removes host', getHost() === null);
      window.__harness.createOverlay('synthetic-session-B');
      await sleep(100);
      check('session B has no A badges', allBadges().length === 0, String(allBadges().length));
      window.__harness.disposeOverlay();
      window.__harness.createOverlay('synthetic-session-A');
      await sleep(120);
      check('annotations rehydrate on session switch back', badges().length === 2, String(badges().length));
      check('status survives session switch', statusText() === '2 条注释', statusText());

      const second = api.listAnnotations('synthetic-session-A')[1];
      const secondBadge = allBadges().find((badge) => badge.dataset.annotationId === second.id);
      check('second badge exists after rehydrate', secondBadge !== undefined);
      secondBadge.click();
      await sleep(50);
      note().value = 'Edited second requirement';
      action('save').click();
      await sleep(70);
      check('second edit serializes', (await serializeAll()).prompt.includes('<note>Edited second requirement</note>'));

      statusButton().click();
      await sleep(50);
      const firstRow = [...getShadow().querySelectorAll('[data-sc-action="edit-row"]')].find((row) => row.dataset.annotationId === first.id);
      firstRow.click();
      await sleep(40);
      action('delete').click();
      await sleep(80);
      check('delete removes annotation from store', api.listAnnotations('synthetic-session-A').length === 1);
      check('delete removes compact token', window.__input.draft === 'existing draft\\n\\n[Comment2]', JSON.stringify(window.__input.draft));
      check('delete leaves one reference', window.__input.occurrences.length === 1);
      check('delete leaves one badge', badges().length === 1, String(badges().length));
      check('status updates after delete', statusText() === '1 条注释', statusText());
      const afterDelete = await serializeAll();
      check('deleted note is not sent', !afterDelete.prompt.includes('Edited first requirement'), afterDelete.prompt);
      check('remaining note is still sent', afterDelete.prompt.includes('<note>Edited second requirement</note>'), afterDelete.prompt);

      window.__harness.setInput({ draft: '', occurrences: [], phase: 'plain' });
      window.__harness.syncStatus();
      await sleep(80);
      check('manual token removal becomes detached', annotationById(second.id).status === 'detached', annotationById(second.id).status);
      check('detached status remains compact', statusText() === '1 条注释 · 未加入', statusText());
      check('detached status stays unboxed without a dashed border', isUnboxed(statusStyle()), JSON.stringify(statusStyle()));
      check('detached badge remains anchored', badges().length === 1, String(badges().length));
      badges()[0].click();
      await sleep(40);
      check('detached editor offers add button', action('add').hidden === false);
      action('add').click();
      await sleep(80);
      check('re-add restores compact token', window.__input.draft.includes('[Comment2]'));
      check('re-add restores queued status', annotationById(second.id).status === 'queued');
      check('re-add status reads one', statusText() === '1 条注释', statusText());

      window.__harness.setInput({ phase: 'submitting', draft: '', occurrences: [] });
      window.__harness.syncStatus();
      await sleep(50);
      check('send clears draft and marks sent', annotationById(second.id).status === 'submitted', annotationById(second.id).status);
      check('sent status is compact', statusText() === '1 条注释 · 已提交', statusText());
      check('sent status stays unboxed', isUnboxed(statusStyle()), JSON.stringify(statusStyle()));
      check('sent badge remains', badges().length === 1, String(badges().length));
      const stillSerializable = await window.__source.codec.serialize(second.ref);
      check('sent annotation remains serializable for re-add', stillSerializable.includes('<note>Edited second requirement</note>'), stillSerializable);
      window.__harness.setInput({ phase: 'plain', draft: '', occurrences: [] });
      window.__harness.syncStatus();
      await sleep(40);
      check('sent status persists after phase returns', annotationById(second.id).status === 'submitted', annotationById(second.id).status);

      api.removeAnnotation('synthetic-session-A', second.id);
      window.__status.refresh();
      await sleep(50);
      const finalStatus = statusVisibility();
      check('removing the last annotation hides the status chip', finalStatus.visible === false, JSON.stringify(finalStatus));
      check('empty status computes display none after removal', finalStatus.hostDisplay === 'none' && finalStatus.buttonDisplay === 'none', JSON.stringify(finalStatus));

      return { checkCount: results.length, results, finalStatus: statusText(), finalDraft: window.__input.draft };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  })

  if (evaluated.exceptionDetails) {
    const description =
      evaluated.exceptionDetails.exception?.description || evaluated.exceptionDetails.text || 'page evaluation failed'
    throw new Error(description)
  }

  const value = evaluated.result.value
  assert.equal(value.results.filter((result) => !result.pass).length, 0)
  console.log(JSON.stringify(value, null, 2))
  const demo = pathToFileURL(resolve('demo/index.html')).href + '?lang=en&dual=1'
  await send('Page.navigate', { url: demo })
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const ready = await send('Runtime.evaluate', { expression: 'Boolean(window.commentDemo && document.querySelectorAll("[data-selection-comment-ui]").length === 2)', returnByValue: true })
      if (ready.result?.value === true) break
    } catch { /* Navigation can replace the execution context between probes. */ }
    await new Promise(resolveWait => setTimeout(resolveWait, 50))
  }
  const releaseSpec = readFileSync(new URL('./browser-release-spec.js', import.meta.url), 'utf8')
  const releaseResult = await send('Runtime.evaluate', { expression: '(' + releaseSpec + ')()', awaitPromise: true, returnByValue: true })
  if (releaseResult.exceptionDetails) throw new Error(releaseResult.exceptionDetails.exception?.description ?? releaseResult.exceptionDetails.text)
  assert.ok(releaseResult.result.value.results.every(item => item.pass))
  console.log(JSON.stringify({ scope: 'React dock with synthetic host adapters', ...releaseResult.result.value }, null, 2))
} finally {
  socket.close()
}
