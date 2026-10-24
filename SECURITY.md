# Security / 安全

This is an early external DSH plugin, not a security isolation boundary. Only current published code is maintained; no warranty or full security audit is claimed.

- Use GitHub's private vulnerability reporting on this repository when available. Do not post real credentials, conversation quotes, browser storage dumps, or full profiles in public issues. If private reporting is unavailable, open a minimal issue asking for a private channel without disclosing exploit details or data.
- The plugin stores quote/note/anchor context in tab sessionStorage and uses the host's reference codec to include them in submitted model context. Other code running on the same origin can access browser storage. Shadow DOM is style isolation, not confidentiality.
- It makes no plugin-controlled network requests and does not read host credential files. DSH's own submission sends selected content to the configured model provider.
- Unknown references reject rather than silently fall back to tokens. XML escaping prevents structural delimiter injection, not model prompt injection.
- A compromised DSH installation, malicious provider or other same-origin plugin is outside this plugin's trust boundary. Clear comments and browser data before sharing a device/session.

安全问题请优先使用仓库的私密漏洞报告；没有该入口时，只提交不含细节的私密联系请求。不要公开凭据、真实原文、浏览器存储或完整 profile。标签页存储不是加密保险箱，Shadow DOM 不是安全隔离，XML 转义不能防模型提示注入。
