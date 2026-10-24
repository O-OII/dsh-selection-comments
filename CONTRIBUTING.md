# Contributing / 贡献

Use Node 22+ and `npm ci --ignore-scripts`, then `npm run build`, `npm run check`, `npm test` and `npm pack --dry-run`. Do not edit `lib/client.js` by hand. Keep locale keys and interpolation parameters equal; `locale/en.json` and `locale/zh.json` are the translation source.

Browser regression: open `demo/index.html?lang=en&dual=1` after installing development dependencies. The demo mounts the real React dock with synthetic input/locale services. `test/browser-harness.mjs` uses a dedicated loopback Chromium CDP endpoint; never use a personal browser profile or expose CDP publicly. Keep screenshots explicitly labelled as fixtures unless a real host path was actually exercised.

Please add tests for bug fixes, including negative/failure cases. In particular protect foreign reference offsets, leading commands, multiple panes, refresh recovery, missing codecs, cancellation, IME and keyboard focus. Do not add network calls or convert this into a permanent notes service without a separate privacy design.

Do not submit private sessions, profile configuration, credentials, status files or machine-specific paths. Report only the minimum synthetic reproduction and exact DSH/browser/Node versions. Features from other projects require source attribution and compatible licensing; public visibility alone is not a license.

---

请使用 Node 22+，修改后构建、检查、跑单测并审查打包清单。不要直接改生成 bundle；中英文字典的键名和插值参数必须一致。浏览器夹具不是运行中的 DSH 验收，截图必须如实标注。

修复请附反例测试，保护其他来源引用、命令、双会话、刷新、失败、IME 和焦点行为。不要提交私人会话、profile、凭据、状态文件或本机路径。借鉴第三方代码须确认许可并保留归属。
