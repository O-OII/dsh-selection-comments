# Usage, language and migration / 使用、语言与迁移

[English README](../README.md) · [中文首页](../README.zh-CN.md) · [Privacy / 隐私](privacy.md)

## Install and migrate / 安装与迁移

The committed client bundle installs without a build or React development dependencies. The official DSH CLI adds the package bundle and its `selection-comments` entry; use the CLI supplied with the installation/profile you intend to change. Replace `desktop` with that profile in the README command.

When migrating from the local `selection-comment` prototype, finish or remove its unsent references, then disable its local entry before enabling this package. Both register the same `selection-comment` reference source and must not run together. Prototype memory/storage is not imported. Do not restore an entire old profile backup over newer settings.

If a running installation does not reload a new host entry, finish in-flight work and perform a normal reload/restart. Another server does not update the existing GUI, and arbitrary source edits do not necessarily hot-reload.

已提交的客户端 bundle 可直接安装，不需要先构建或安装 React 开发依赖。使用目标 DSH 安装所附的官方 CLI，`desktop` 应替换成实际目标配置；组合包会自动插入 `selection-comments`。

从本地 `selection-comment` 原型迁移时，先处理完旧插件未提交的引用，再停用本地入口，然后启用新包；两者注册相同引用来源，不能同时运行。不会导入旧原型的内存或存储。不要整份恢复过期 profile 备份覆盖新设置。如新增 host 入口未重载，请结束在途任务后正常刷新/重启，不要另起服务替代当前 GUI，也不要假设源码任意修改都热更新。

## Working with references / 引用操作

- Add with **Add comment** or `Ctrl/⌘+Enter`; `Esc` cancels/closes. The dialog respects keyboard focus and reduced motion; IME composition is not treated as a submit shortcut. Changes are blocked while the host is submitting/adjudicating.
- A badge and compact draft reference address the same comment. Open either to edit/delete/re-add or enter **All comments**. Removing a draft reference detaches it; it does not delete the stored comment.
- **Delete all comments** removes this session's comments, draft references and plugin tab cache. It does not retract previously sent messages.
- Each overlay belongs to its own conversation pane. Ambiguous ownership fails closed instead of choosing the first transcript. The host retains responsibility for failed/cancelled submissions and restored drafts.
- **Submitted** means the reference left the draft during submission, not that the model received it. Missing references reject serialization; remove/recreate them rather than sending a bare `[CommentN]` token.

添加支持 `Ctrl/⌘+Enter`，`Esc` 取消/关闭，IME 组合态不会触发提交快捷键；宿主提交/审议中禁止修改。角标与紧凑引用指向同一注释；移除草稿引用仅使其脱离草稿，仍可重新加入。「删除全部注释」同时清除会话注释、草稿引用与缓存，不撤回已发送消息。每个 overlay 限定在所属会话正文，归属不明时不操作。「已提交」不是送达回执，失败、取消与草稿恢复由宿主负责；未知引用拒绝序列化，需移除并重新创建。

### Serialized model context / 提交上下文

The DSH reference codec expands quote and note together at submit time:

```xml
<selection_comment index="1">
<quote>A passage from the conversation / 会话中的一段原文</quote>
<note>Please include a reproducible test. / 请补充可重复的测试步骤。</note>
</selection_comment>
```

`&`, `<` and `>` are escaped. XML escaping is not a prompt-injection security boundary: quoted content is untrusted user-supplied context. See [privacy and limits](privacy.md) for storage, data flow and retention.

提交时原文与注释一起展开为上述文本；XML 转义不等于防模型提示注入，选区内容仍是不可信的用户文本。存储、传输和保留边界见[隐私说明](privacy.md)。

## UI language / 界面语言

The shipped default is **`zh-CN`**, even in an English browser/DSH installation or without a locale service. The existing editor/list offers **简体中文**, **English**, and **跟随 DSH / Follow DSH** (`auto`). The choice affects this plugin's panes in the current client instance; refresh/HMR resets it to the client composition default. It is not a saved browser preference and does not change a profile or add a settings page.

Only `auto` follows the optional DSH locale service: `en`/`en-*`/`en_*` select English, `zh` variants use the Simplified Chinese dictionary, and missing/unsupported values fall back to Chinese. Explicit English is not overridden by host changes. Already inserted labels update without changing reference identity, draft text or offsets. IDs, `[CommentN]` clipboard tokens and serialized XML remain language-independent. **Upgrade from 0.3.0:** choose `auto` to restore that version's always-follow-DSH behavior.

发布产物默认 **`zh-CN`**；弹窗/列表标题旁可选简体中文、English 或跟随 DSH（`auto`）。选择仅保留在当前客户端实例内存，作用于本插件各会话区域；刷新/HMR 后恢复客户端组合默认值，不存浏览器偏好、不改 profile、不新增设置页。仅 `auto` 跟随可选宿主语言服务；不支持或缺失时回退中文，显式英文不受宿主变化覆盖。切换不改变引用 ID、草稿文本与偏移，剪贴板 `[CommentN]` 和 XML 不翻译。从总是跟随 DSH 的 0.3.0 升级后，如需旧行为请选择 `auto`。

### Client integration / 客户端集成

Integrators may pass `{ locale: 'zh-CN' | 'en' | 'auto' }` as the browser contribution's second `apply(ctx, config)` argument. Omitted/invalid choices select Chinese. The browser module exports `setLocalePreference(value)` / `getLocalePreference()` for integrations. This is a low-level **client-composition** option: a server/profile Cordis entry is not assumed to forward this configuration into the browser. Ordinary users should use the dialog selector.

集成者可向浏览器贡献的 `apply(ctx, config)` 第二参数传上述 `locale`，省略/无效为中文；模块也导出偏好 setter/getter。这是底层 **client composition** 选项，不意味着服务端/profile Cordis 配置会传入客户端；普通用户使用弹窗选择器即可。
