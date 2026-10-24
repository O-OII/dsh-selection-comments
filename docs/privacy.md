# Privacy and limitations / 隐私与限制

## Data flow

1. Selection is read only from an eligible conversation transcript belonging to its mounted seat.
2. Quote, note, text offsets and adjacent anchor context are held in memory and serialized to this plugin's browser-tab sessionStorage cache, under a versioned prefix and session ID.
3. A compact semantic reference is put into the existing draft. It is not hidden background context: deleting that reference detaches the comment.
4. When DSH submits the draft, the registered codec returns quote+note as escaped text for the chosen model. The plugin has no separate network/analytics backend.

Tab storage may survive reload and, depending on the browser, restored/crashed tabs. It is not encrypted, securely erased or isolated from other same-origin scripts. Nothing is synced across accounts/devices. Normal tab closure is a browser lifecycle rule, not a security deletion guarantee.

## Deletion and recovery

Delete a single comment from its editor, or use All comments → Delete all comments. The latter removes this session's comments, references and tab-cache entry; it does not erase messages already sent to a model or remote provider retention. For sensitive material also use the browser's data controls and your provider's retention policy.

If storage is absent/full, a visible message explains that recovery is unavailable. The in-memory codec still works. A known stale saved entry is removed best-effort on failed updates; if the browser prevents all storage access, the plugin cannot guarantee deletion or recovery. Unavailable refs reject, so remove/recreate them instead of expecting content to be inferred from a number.

## Explicit limits

- No cross-tab clipboard-reference transfer, session-fork mapping, cloud sync or permanent note archive.
- Anchors depend on text still existing; edited/deleted/virtualized messages can hide a badge. Text context remains available if its reference/store is intact.
- Pane ownership uses a React seat marker and a unique transcript in the enclosing conversation subtree. Unsupported/ambiguous layouts fail closed.
- Comments remain available for re-add after submission; submitted is not a server/model receipt.
- Quote/note each have a 20,000 UTF-16-code-unit limit. Browser storage has its own lower practical quota; large conversations are not an unlimited archive.
- XML escaping is not a prompt-injection defense. Inspect what you submit, especially quoted instructions.

## 中文摘要

原文、注释、偏移与锚点前后文会保留在当前标签页的 sessionStorage，按会话隔离；同源脚本可能读取，不能当作加密或安全擦除。浏览器恢复标签页时可能恢复数据。

「删除全部注释」移除本地映射和草稿引用，不撤回已发送消息或抹除服务商数据。存储不可用时会提示，未知引用拒绝序列化，不会仅发送裸编号。不支持跨标签页、跨设备或 fork 迁移。失锚、提交状态和实际宿主发送都必须按其真实边界理解。
