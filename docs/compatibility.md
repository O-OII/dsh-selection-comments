# Compatibility and evidence / 兼容性与证据

This is an external plugin release, not a certification of every DSH or browser version.

## 0.3.3 grouped-transcript selection fix / 分组正文划词修复（2026-10-27）

The previous 147 synthetic browser assertions did **not** establish real-session selection compatibility. The original demo had only one `data-chat-flow` per pane; real rc.3 ChatView and nested ChatGroupSeat content both expose that attribute. Raw descendant counts therefore disabled the selection action in a grouped conversation. Inspection of the supplied official rc.3 bundles and the older installed prototype identified this difference.

0.3.3 resolves only outer transcript roots within the nearest `data-conversation-content`, checks `data-conversation-session` against the dock, and rejects foreign embedded occurrences at the selection boundary. Genuine parallel roots remain ambiguous/fail-closed; legacy layouts without occurrence attributes use the nearest unambiguous ancestry path. The fix changes extension ownership checks without rewriting stored sessions.

- Build/check and **57 Node tests passed** with `DSH_CONVERSATION_BUNDLE` set to the supplied exact rc.3 bundle. This includes eight new ownership/official-attribute contract tests. Without the optional bundle path the normal result is 55 passed plus two explicit skips. Pack smoke passed with 27 published files, version 0.3.3 package/lock parity and byte-identical generated client; `git diff --check` passed.
- The React browser fixture now carries official occurrence/session attributes and a nested process flow per pane. Its full isolated Chromium rerun passed **149 assertions (76 + 30 + 31 + 8 + 4)**, including two new ownership assertions. This remains separate from the installed-session acceptance below; static/fixture tests alone do not certify the live GUI.
- **Actual current GUI acceptance:** after official local installation of 0.3.3, a real rc.3 conversation with five flows/one outer root passed an 18-character paragraph selection, visible action hit-testing at both document and ShadowRoot levels, trusted pointer activation, and opening the actual **Add comment** dialog with the exact 18-character quote and empty note. Cancel then hid the backdrop/dialog, restored all background inert state and left zero annotation badges. Nothing was saved or sent; no model call was made. An earlier element screenshot's `scrollIntoView` hid the action via its existing scroll handler; the successful interaction used trusted coordinates without scrolling, not a z-index workaround.

此前 147 项合成浏览器断言**没有**证明真实会话划词兼容：夹具每个 pane 仅一个 flow，而 rc.3 根正文和分组过程均有该属性，原始计数使真实分组会话误拒。0.3.3 按最近官方 occurrence、会话 ID 和外层 flow 绑定，嵌套过程可用、真实跨会话仍拒绝。提供精确 rc.3 bundle 路径时 57 项 Node 全通过；不提供时 55 通过、2 明确跳过。不把 SDK 静态检查或修正后的夹具当成已实际操作当前 GUI。**本机真实验收已通过：** 官方安装 0.3.3 后，在含 5 个 flow、1 个外层根的 rc.3 实际会话中选择正文 18 字，按钮通过 document/ShadowRoot 两级命中检查，可信坐标点击打开真实「添加注释」弹窗，原文 18 字、注释为空；取消后弹窗不可见、背景 inert 全解除、角标为 0。未保存、未发送、未调用模型。此前元素截图的 `scrollIntoView` 触发既有滚动隐藏逻辑，并非层叠缺陷；成功点击没有用改 z-index 或强制 DOM click 绕过。另已完整重跑隔离 Chromium 回归：149 项断言（76+30+31+8+4）全部通过，含双会话嵌套 flow 新用例。

## 0.3.2 sent-card and skin update / 发送卡片与配色更新（2026-10-27）

- **Official seam verified by inspection:** the supplied DSH 0.2.1 and current 0.2.1-rc.3 conversation package document `uiConversation.userText.register` and the keyed inline `conversation.user.text.node` Slot. The host owns raw-text fallback and original Copy/Edit text. No ASAR implementation is copied into the package; no live installation/configuration was changed.
- **Local automated evidence:** build/check and 49 Node tests passed, including the real React server renderer, literal HTML safety, one-pass entity decoding, historical snapshots after local edits/deletion, exact text ranges, normal/missing-service registrations and the supplied official `UserTextDocument` scheduler. Standard `npm test` runs 48 tests plus one explicit skip unless `DSH_CONVERSATION_BUNDLE` is set.
- **Browser evidence:** all 147 assertions passed on a dedicated isolated Chromium: 76 legacy overlay/status-helper checks, 28 two-pane React checks, 31 new send/history/card/skin checks, 8 native Chromium hover/focus CSS-state combinations (two primary actions × light/dark/transparent/missing-token) and 4 same-tab refresh checks. These use public synthetic transcript/input/locale/Factory adapters, not a live installed DSH session. Copy/Edit assertions test original-text adapters, not real Host clipboard/edit menus. The legacy status helper is still unregistered in production.
- **Build / package:** build/check, fixture/driver syntax checks, `git diff --check` and pack smoke passed; 25 published files, version 0.3.2 package/lock parity and byte-identical generated client verified.
- **Compatibility fallback:** composer functionality retains the declared rc.2 baseline; rich sent cards additionally require the optional official user-text seam. Hosts lacking it retain raw sent XML. Malformed/noncanonical historical blocks remain ordinary text. Sent cards are read-only message snapshots; local comment edits do not mutate them.
- **Not established:** remote model delivery, actual installed host clipboard/edit menus and all skin/browser/desktop versions. The previously published README screenshots show composer/editor/manager states, not new sent-card acceptance.

0.3.2 已通过 build/check 与 49 项 Node 测试（含真实 React 安全渲染及所提供官方 rc.3 调度器）；标准运行未配置官方 bundle 路径时为 48 通过、1 项明确跳过。专用隔离 Chromium 完整通过 147 项断言（76+28+31+8+4），覆盖发送/历史卡片、展开/转义/语言、浅色/深色/透明/缺 token 与真实 CSS hover/focus 状态；复制/编辑仍为保留原文的合成适配，并非实际宿主菜单。打包 smoke 通过 25 文件白名单、0.3.2 版本/lock 一致与 bundle 字节一致。只使用官方可选扩展，缺接口保留 XML；不改模型载荷与宿主复制/编辑原文，本仓库改动不涉及实际安装/配置。尚不能据此宣称真实宿主复制菜单、远端模型和所有皮肤均已验收。

## Historical evidence / 历史证据

| Layer | Local evidence for 0.3.1 (2026-10-26) |
|---|---|
| Intended host contracts | DSH 0.2.1-rc.2: semantic draft InputActions, inputTriggers reference codec, conversation.input.dock and optional client locale service |
| Node tests | 37 tests passed on Windows Node 22.22.3; Chinese default with English browser/host, explicit English, opt-in auto, missing/unsupported locale fallback, client config, preference-only notifications, plus existing keys/metadata/codec/storage/offsets/pane coverage |
| Chromium legacy fixture | 76 checks passed with English navigator/page and the unconfigured Chinese client; includes the historical unregistered status helper, not a production footer |
| React release fixture | 28 checks passed with two real React dock contributions: English host still defaults Chinese, accessible in-dialog English/auto selection, host-change isolation, unsupported fallback, cross-pane selector updates, unsaved input, IME, busy/focus/inert, labels/XML/HTML and no footer |
| Same-tab refresh | 4 browser checks passed: resets transient auto to default Chinese despite English browser/host, restores both sessions and serializes full notes; host draft restoration remains synthetic |
| Build / package | build + check passed; pack smoke verified 18 published files, 0.3.1 package/lock parity, and default/English/auto/fallback behavior from the extracted client |
| Demo images | Real plugin/React rendered over synthetic transcript/input/locale fixtures. They are explicitly labelled and contain no private session |
| CI | Node 22/24 checks and a dedicated Chromium fixture job; the actual current Actions result is authoritative, not this planned matrix |
| Not established | Real installed DSH sink/remote provider delivery, all Desktop builds/platforms, mobile selection menus, cross-tab/fork persistence or multi-window real Host transport |

`apply(ctx, { locale })` is a low-level client-composition option; no profile/server-to-client forwarding is assumed. Ordinary users can select Chinese/English/auto in the existing dialog. Selection is transient per client instance and resets on refresh/HMR; no new persistence or installation/profile changes were made.

The package uses no copied ASAR implementation. DSH remains in developer preview and can change contracts. An engine range only expresses intended API compatibility; it is not proof of testing every release in that range.

## Reproduce

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
npm run pack:smoke
# With a dedicated Chromium listening on loopback CDP_PORT (default 9333):
npm run test:browser
```

The browser script loads local fixture files, not the existing DSH URL. A real-host acceptance should separately verify source discovery, draft references, actual submit-time serialization, failure/cancellation, refresh recovery, two conversation panes and language switching in an isolated profile. Do not use private conversations or paid model requests without explicit approval.

## 中文

0.3.1 本地通过了 37 项 Node 测试、76 项历史合成浏览器检查、28 项真实 React dock 双会话检查与 4 项同标签页刷新检查；浏览器 navigator/page 和合成宿主均显式英文，插件仍默认中文。新增覆盖弹窗英文/auto 选择、宿主变化隔离、不支持语言回退、跨会话同步与刷新后恢复默认。build/check 与 18 文件的 pack smoke 通过，解包后的客户端也验证中文默认/显式英文/auto/回退。原历史 status helper 没有在生产注册，不应理解为恢复了底部入口。

`apply(ctx, { locale })` 是底层客户端组合参数，不保证 profile/服务端配置会传入浏览器；普通用户可用现有注释弹窗标题旁的小选择器。选择只存于客户端实例内存，刷新/HMR 后恢复组合配置默认值。本轮不新增持久化，也不修改安装或 profile。

所有浏览器检查的正文、输入/语言/宿主适配仍为合成；不能据此保证实际 DSH 发送 sink、远端模型、所有平台或新版本均已验收。当前 Actions 结果应以 GitHub 实际运行记录为准。真实部署请另在隔离 profile 检查，不动现用配置来演示，不未经同意调用收费模型。

## Documentation refresh / 文档刷新（2026-10-27）

The bilingual README refresh adds six reproducible 1280 × 820 screenshots: selection action + badges/references, editor with language selector, and all-comments manager, each in Chinese and English. Twenty new structured-MCP acceptance assertions passed through visible add/edit/list actions and local quote+note codec expansion. The actual plugin bundle and React dock ran with public synthetic transcript/input/locale services; no installed DSH transport, real profile or model request was used. Reproduction steps are in [development and screenshots](development.md).

The existing 37 Node tests and `npm run check` passed again. The updated pack smoke checked 25 published files, the new documentation whitelist, display-only `meta.title` / `meta.description` locale exports via Node resolution, unchanged UI dictionaries, version 0.3.1/lock parity and byte-identical packed client code. It did not verify the metadata's visual presentation in an installed host. The 76/28/4 browser suites and 18-file package result in the earlier table are historical results, not reruns or the current package file count.

本轮六张截图由真实组件与公开合成数据生成，20 项新增浏览器断言通过；现有 37 项 Node 测试与 check 再次通过。更新后的打包 smoke 通过 25 文件白名单、展示元信息 export 的 Node 解析、UI 字典隔离与客户端字节一致性验证，版本保持 0.3.1。未验收真实宿主中的元信息视觉呈现或实际发送；上表的 76/28/4 浏览器结果和 18 文件打包结果为历史记录，本轮没有重跑这些完整浏览器套件。
