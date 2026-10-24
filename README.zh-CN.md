# DSH 选区注释

[English](README.md) · [隐私与限制](docs/privacy.md) · [兼容性与验证](docs/compatibility.md)

针对会话原文写注释，让输入框保持简洁。面向 DeepSeek Harness Web/Desktop，提供**编号锚点、可编辑注释、紧凑语义引用，以及英文/简体中文界面**。

![编号角标与紧凑引用](docs/images/comments-zh-CN.png)

> 展示图来自真实插件客户端和 React dock，但正文、输入桥接与语言服务是**合成夹具**；不是运行中的私人 DSH 会话截图。

## 功能与取舍

- 选中会话正文后添加注释；通过编号角标或输入框引用编辑、删除、重新加入。
- 原文与注释共同组成一个语义引用，提交时由 DSH reference codec 展开，不把完整内容预先塞进草稿。
- 保持输入框简洁，**没有额外的底部计数入口**；弹窗中可进入「全部注释」。
- 使用标签页 `sessionStorage` 按会话保存，支持**同一浏览器标签页内刷新恢复**，不是永久便签、账号同步或云端存储。
- 每个会话的 overlay 限定在所属正文区域；无法确认归属时不操作，不默认选第一个会话。
- 跟随 DSH 语言服务：`en` 为英文，`zh-*` 使用简体中文，其他语言回退英文；切换语言不改变引用身份、草稿文本或偏移。
- 处理中文/日文 IME 组合态、提交中禁止修改、键盘焦点、Esc 与减少动画偏好。

## 安装

目标 API 基线：**DSH 0.2.1-rc.2**，Web 或 Windows Desktop。声明的版本范围不等于逐个版本均已实测，详见[验证矩阵](docs/compatibility.md)。

```sh
git clone https://github.com/O-OII/dsh-selection-comments.git
cd dsh-selection-comments
# 使用目标 DSH 安装所附的 CLI，避免操作另一个安装/配置：
dsh plugin --profile desktop add --ignore-scripts .
```

已提交可直接部署的客户端 bundle，安装不需要构建，也不需要 React 开发依赖。组合包自动插入 `selection-comments`。需要其他 profile 时替换 `desktop`。

**从本地原型迁移：**先处理完旧插件未提交的引用，再停用 `selection-comment` 本地入口，然后启用新包。两者注册相同的 `selection-comment` 引用来源，不能同时运行；不会导入旧原型的内存数据。不要整份恢复过期 profile 备份，以免覆盖其他设置。

如果安装版本没有自动重载新增 host 入口，请先结束在途任务，再正常刷新/重启。不要另起服务代替当前 GUI，也不要假设任意源码修改都能热更新。

## 使用

1. 在会话正文选中文字，点击「注释」。
2. 填写内容，点击「添加注释」或按 `Ctrl/⌘+Enter`；Esc 取消。
3. 原文附近出现编号角标，原草稿中加入紧凑的「注释 N」引用。
4. 点击角标或引用可编辑、删除、重新加入，或进入「全部注释」；「删除全部注释」会一并移除该会话的草稿引用和本插件标签页缓存。
5. 使用 DSH 正常提交。模型收到的是完整原文和注释，不是裸编号。

![中文注释编辑器](docs/images/editor-zh-CN.png)

提交时的文本上下文示例：

```xml
<selection_comment index="1">
<quote>会话中的一段原文</quote>
<note>请补充可重复的测试步骤。</note>
</selection_comment>
```

`&`、`<`、`>` 会转义，但 **XML 转义不等于防模型提示注入**；选区内容仍属于不可信的用户提供文本。

## 恢复、状态与隐私

原文、注释和定位前后文会写入当前浏览器标签页的 **sessionStorage**，按会话 ID 隔离。刷新/HMR 后可恢复，通常随标签页关闭结束；部分浏览器会在崩溃恢复或「重新打开关闭的标签页」时还原数据，因此**不是安全擦除机制**。

- 本插件不主动联网、不发送遥测，也没有自己的云端存储。
- 只有引用随消息提交时，DSH 才会将其内容发给选中的模型。
- 受限或配额耗尽时退回内存并提示无法刷新恢复；更新缓存失败时尽力移除已知旧数据，避免回载过期注释。
- 找不到内容的引用会拒绝序列化，不会悄悄只发送 `[CommentN]`；需要移除并重新创建。
- 「已提交」只表示引用在提交阶段移出了草稿，**不表示模型已收到或调用成功**。
- 不支持跨标签页引用复制、跨设备同步、会话 fork 的注释迁移或永久笔记归档。

敏感内容请在用后「删除全部注释」，必要时使用浏览器数据清理，详见[隐私说明](docs/privacy.md)。

## 开发与测试

需要 Node 22+；React 18 仅供浏览器演示夹具使用。

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
npm pack --dry-run
```

翻译字典位于 `locale/en.json` 和 `locale/zh.json`。构建会校验键名/参数一致性并生成 `lib/client.js`；请编辑源码与字典，不直接改生成产物。source/ref/clipboard token 不随翻译变化。

安装开发依赖后打开 `demo/index.html` 可交互预览：`?lang=zh-CN&seed=1` 展示中文示例，`?lang=en&dual=1` 在两个正文区域挂载**真实 React dock**。输入和语言服务为合成适配，「预览提交内容」不调用模型。

可选 Chromium 流程测试使用专门的 headless 浏览器和本机 CDP 端口（`CDP_PORT`，默认 9333）：

```sh
npm run test:browser
```

不要把 CDP 暴露公网，也不要连接个人浏览器配置。CI 启动自己的隔离浏览器。单测与夹具通过不等于真实 DSH 发送链路、每个桌面版本均已验收，详见[兼容性说明](docs/compatibility.md)。

## 同类项目与定位

这不是首个 DSH 注释插件。同类包括 [dsh-annotation](https://github.com/omdsh-dev/dsh-annotation)、[dsh-quote-annotate](https://github.com/wangwei-wade/dsh-quote-annotate)、[dsh-inline-comments](https://github.com/zenvertao/dsh-inline-comments)。本项目选择紧凑的原文+注释实体、编号锚点、不增加 composer footer，以及明确的标签页级恢复，而不是永久笔记数据库。

MIT — © 2026 O-OII contributors。参见 [LICENSE](LICENSE)、[贡献指南](CONTRIBUTING.md)、[安全反馈](SECURITY.md)。
