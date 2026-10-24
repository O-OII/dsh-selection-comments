# Compatibility and evidence / 兼容性与证据

This is an initial external plugin release, not a certification of every DSH or browser version.

| Layer | Evidence at initial preparation |
|---|---|
| Intended host contracts | DSH 0.2.1-rc.2: semantic draft InputActions, inputTriggers reference codec, conversation.input.dock and optional client locale service |
| Node tests | 31 tests passed locally on Windows Node 22.22.3; English/Chinese keys, metadata, codec, missing/aborted refs, storage reload/failure, duplicate offsets and pane ownership helpers |
| Chromium legacy fixture | 75 checks passed using the actual client against synthetic transcript/input adapters; includes the historical unregistered status helper, not a production footer |
| React release fixture | 22 checks passed with two real React dock contributions: pane ownership, locale/unsaved note, IME, busy state, focus/inert, reference labels, XML/HTML text and no footer |
| Same-tab refresh | Browser fixture reload recovered both comments and serialized both restored references; host draft restoration was synthetic |
| Demo images | Real plugin/React rendered over synthetic transcript/input/locale fixtures. They are explicitly labelled and contain no private session |
| CI | Node 22/24 checks and a dedicated Chromium fixture job; the actual current Actions result is authoritative, not this planned matrix |
| Not established | Real installed DSH sink/remote provider delivery, all Desktop builds/platforms, mobile selection menus, cross-tab/fork persistence or multi-window real Host transport |

The package uses no copied ASAR implementation. DSH remains in developer preview and can change contracts. An engine range only expresses intended API compatibility; it is not proof of testing every release in that range.

## Reproduce

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
# With a dedicated Chromium listening on loopback CDP_PORT (default 9333):
npm run test:browser
```

The browser script loads local fixture files, not the existing DSH URL. A real-host acceptance should separately verify source discovery, draft references, actual submit-time serialization, failure/cancellation, refresh recovery, two conversation panes and language switching in an isolated profile. Do not use private conversations or paid model requests without explicit approval.

## 中文

本地通过了 31 项 Node 测试、75 项历史合成浏览器检查、22 项真实 React dock 的双会话夹具检查，并验证同标签页刷新后的引用恢复。原历史 status helper 没有在生产注册，不应理解为恢复了底部入口。

所有浏览器检查的正文、输入/语言/宿主适配仍为合成；不能据此保证实际 DSH 发送 sink、远端模型、所有平台或新版本均已验收。当前 Actions 结果应以 GitHub 实际运行记录为准。真实部署请另在隔离 profile 检查，不动现用配置来演示，不未经同意调用收费模型。
