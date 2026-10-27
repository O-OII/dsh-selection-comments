# Changelog

## 0.3.2 — 2026-10-27

- Render sent selection comments through the official optional `uiConversation.userText` rule registry and keyed `conversation.user.text.node` Slot, with compact quotation/comment cards, expansion, accessible labels and inline queue previews.
- Keep model serialization, semantic draft references and host Copy/Edit original text unchanged. Re-render compatible historical raw tags without depending on tab storage; malformed/unrecognized blocks and hosts without this seam retain ordinary raw text.
- Escape through React text children only; no `innerHTML`, transcript rewriting, event interception or private host imports. The existing floating overlay stays body-mounted in its ShadowRoot.
- Use the matched `button-primary-fill` / `label-primary-foreground` / `button-primary-hover` family for both filled actions, with an opaque matched fallback that does not use possibly transparent `bg-base` as text.
- Add Node/real React safety and supplied-host scheduler tests, send/history and skin browser scenarios, update the public demo, bilingual documentation and generated bundle.

通过官方可选 userText 规则与 keyed Slot 将发送后及兼容历史消息显示为可展开的原文/注释卡片，队列保持行内预览；模型 XML、草稿引用语义与宿主复制/编辑的原文不变。历史展示不依赖本地注释缓存；格式不完整或宿主缺少扩展接口时保留原始文本，不改写正文 DOM。浮动与弹窗主按钮统一使用匹配的填充/前景/悬停 token 和不透明回退，兼容透明 bg-base。更新生成产物、双语文档与回归测试。

## 0.3.1 — 2026-10-26

- Default the shipped UI and missing/unsupported locale fallback to Simplified Chinese, independent of browser or DSH language.
- Add a small language selector to the existing comment dialog: Chinese, English, or opt-in `auto` following the DSH locale service. Choices are client-instance-only; no settings page or new persistence.
- Accept a low-level client `locale` option (default `zh-CN`, explicit `en` / `auto`) and expose preference helpers; do not imply profile configuration is forwarded to the browser.
- Preserve reference IDs, `[CommentN]` tokens, XML context, text offsets and unsaved notes across language changes. Rebuild the committed client from source/dictionaries.
- Expand default/English/auto/fallback regression coverage in Node, the browser harness and the actual packed bundle; synchronize package/lock/pack version assertions.

默认界面与缺失/不支持语言的回退改为简体中文，英文浏览器/宿主也真正默认中文。现有弹窗提供简中、英文、跟随 DSH 的小选择器；支持底层客户端 `locale` 参数，但不声称 profile 配置可传入客户端。选择仅保留在当前客户端实例，刷新后恢复组合配置默认值；引用身份、XML、草稿偏移与未保存输入不变。更新双语文档、生成产物与回归/打包断言。

**Upgrade / 升级：** 0.3.0 always followed DSH; select `auto` to retain that behavior. 0.3.0 总是跟随 DSH，如需旧行为请显式选择 `auto`。

## 0.3.0 — 2026-10-24

Initial public package, adapted from the local selection-comment prototype.

- English/Simplified Chinese dictionaries, DSH locale subscription and locale-only reference label updates.
- Tab-scoped refresh recovery with validation and visible storage-failure warnings.
- Seat-scoped transcript ownership; no first-pane fallback for ambiguous layouts.
- Remove all occurrences of a repeated reference while preserving other reference offsets and command metadata.
- Modal focus/inert cleanup, IME-aware shortcuts and busy-submission guards.
- Honest tentative submitted state, not a delivery receipt.
- Independent DSH bundle, committed generated client, MIT license, reproducible build, CI and labelled synthetic demos.
- No composer footer counter reintroduced; the comments list is available in the editor.

首次公开整理：中英国际化、标签页恢复、会话归属、重复引用删除和键盘交互修复；保留无底部计数入口的设计。真实宿主/模型传输的验证边界见兼容性说明。
