# Changelog

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
