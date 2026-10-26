# Development and screenshots / 开发与截图复现

[Usage / 使用](usage.md) · [Compatibility / 兼容性](compatibility.md) · [Contributing / 贡献](../CONTRIBUTING.md)

## Build and verify / 构建与验证

Node 22+ is required. React 18 is a development dependency for the browser fixture, not a bundled copy of the DSH application.

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
npm pack --dry-run
```

Edit `src/client.js`, `locale/en.json` and `locale/zh.json`, not the generated `lib/client.js`. Build validates matching dictionary keys/interpolation parameters and generates the deployable bundle. Reference IDs/source/clipboard tokens are stable and never translated.

需要 Node 22+；React 18 仅用于浏览器夹具。修改源码与中英字典，不手改生成 bundle；构建校验翻译键与插值参数。引用 ID、来源名和剪贴板 token 保持语言无关。

Display-only package metadata lives separately in `locale/display/{en,zh}.json` as `meta.title` / `meta.description`. The public `./locale/*.json` package export maps to those files; the UI build still reads only the flat `locale/en.json` / `locale/zh.json` dictionaries. `npm run pack:smoke` checks the extracted package's Node resolution, metadata, runtime dictionaries and unchanged client bytes. Set `DSH_PACK_SMOKE_OUT` to an isolated evidence directory to keep smoke output outside the checkout's default `.pack-smoke`.

展示元信息位于独立的 `locale/display`，通过包的 `./locale/*.json` export 暴露；UI 构建仍只读取原平面字典，不把 `meta` 注入运行时。打包 smoke 验证解包后的 Node 路径解析、展示元信息与客户端字节一致性；`DSH_PACK_SMOKE_OUT` 可指定隔离证据目录。

## Public demo / 公开演示

After `npm ci --ignore-scripts`, open `demo/index.html` directly in a browser; no server or DSH profile is needed. It loads local React/ReactDOM and the real `lib/client.js` contribution. The dock mounts the actual plugin's selection overlay, badges, editor, manager and reference codec. The transcript, locale service, InputActions store and visible composer chips are **synthetic adapters**, not the DSH application. **Preview submitted context** expands the real codec locally without contacting a model.

| Query | Result |
|---|---|
| `?lang=zh-CN` | Chinese sample transcript, default Chinese plugin UI |
| `?lang=en&locale=en` | English sample transcript and explicit English plugin UI |
| `?lang=zh-CN&seed=1` | Two prefilled Chinese sample comments |
| `?lang=en&locale=en&dual=1` | Two real React docks, English plugin UI |
| `?lang=en&dual=1` | English synthetic host, plugin still defaults Chinese |
| `?lang=en&locale=auto&dual=1` | Plugin follows the English synthetic host |

`lang` chooses the synthetic host language; `locale` chooses the plugin preference. The demo's top language button switches the sample host and opts the plugin into `auto`; use the actual dialog selector to exercise an explicit preference. The top **Show example** button seeds two sample comments for convenience; it is fixture UI, not a new product toolbar. `commentDemo.select(sessionId, which, start, end)` only prepares a DOM selection for automation. `commentDemo.seed()` uses the production helpers to seed sample data; screenshot acceptance below instead adds comments through the visible production dialog.

安装开发依赖后直接打开 `demo/index.html`，无需服务器或 DSH profile。加载真实 React、客户端 bundle 和 dock；选区浮层、角标、编辑器、管理列表与 codec 来自产品代码，正文、语言服务、输入状态和可见 composer chips 为合成适配。「预览提交内容」仅本地展开，不调用模型。顶部示例/语言/双会话按钮属于夹具，不是产品新增入口。`lang` 控制合成宿主语言，`locale` 控制插件偏好；顶部语言按钮还会切到 `auto`，测试显式偏好请用真实弹窗选择器。

## Reproduce the six README images / 复现六张首页图片

Use a fresh **isolated browser context** for each language, viewport **1280 × 820**, browser zoom **100%**, and the two single-pane URLs above without `seed=1`. Use only the public sample text. Do not attach to a personal browser/profile or change the shared browser configuration.

1. Select the full first assistant paragraph, click **Comment / 注释**, enter the first note below, and choose **Add comment / 添加注释**. Repeat for the second paragraph and second note.
2. **Selection and references:** select the first 42 UTF-16 units of the first English paragraph (15 for Chinese). Capture while the actual selection action, badges 1/2 and compact references are visible → `docs/images/comments-{en,zh-CN}.png`.
3. Clear the selection, click the first compact reference, and capture the **Edit comment #1 / 编辑注释 #1** dialog, including its visible language selector → `docs/images/editor-{en,zh-CN}.png`.
4. Choose **All comments / 全部注释** and capture the real manager with both entries and bulk-delete action → `docs/images/manager-{en,zh-CN}.png`.
5. Close the dialog and choose **Preview submitted context / 预览提交内容**. Check that both quotes/notes appear inside `<selection_comment>` XML; this is a local fixture check, not model delivery.

| Note | English | 简体中文 |
|---|---|---|
| First | Please add repeatable test steps. | 请补充可重复运行的测试步骤。 |
| Second | Separate real-environment evidence from fixtures. | 标明真实环境与合成夹具的区别。 |

For structured browser automation, use the `my-agent-browser` skill's MCP `new_page` with a distinct named `isolatedContext`, then `resize_page`, `take_snapshot`, `evaluate_script` to prepare the selection, and `click` / `fill` against the latest snapshot's UIDs. Re-snapshot after each action; use `take_screenshot` to write PNGs. No image-generation model, hand-drawn system UI, private transcript or profile state is involved. Font rendering, caret/toast timing and antialiasing can vary; reproducibility means the same real components and public states, not byte-identical PNGs.

每种语言使用全新隔离上下文、1280 × 820 视口和 100% 缩放，按上表填入公开示例注释。第一张选择英文首段前 42 个 UTF-16 单元/中文前 15 个，保留真实选区按钮与编号引用；第二张点击第一条引用，展示含语言选择器的编辑弹窗；第三张进入「全部注释」。截图为真实浏览器渲染，不手画系统界面、不使用私人数据；字体、光标和 toast 时机可略有差异，不承诺 PNG 字节完全相同。

## Browser regression and test boundaries / 浏览器回归与边界

The optional Chromium harness uses an already-running, dedicated headless browser with loopback CDP (`CDP_PORT`, default 9333):

```sh
npm run test:browser
```

Do not expose CDP on a public interface or attach a personal browser profile. CI starts an isolated browser. Existing browser/unit results and screenshot acceptance do not establish installed DSH transport, remote model delivery, every Desktop build, mobile selection or multi-window real-host behavior. The [verification matrix](compatibility.md) records what was actually checked; real-host acceptance belongs in a separate isolated profile.

可选浏览器流程测试使用专门的 headless Chromium 与本机 CDP 端口；不暴露公网、不连接个人浏览器。单测、真实组件夹具和截图验收都不能代表真实 DSH 发送链路、远端模型或全部桌面版本已通过。实测边界见[兼容性文档](compatibility.md)，真实宿主验收应另用隔离 profile。
