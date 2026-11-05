# Agent 接口設計

先讀 [活躍接口](LIVE-API.md)。
首版建造器可以實際取材、驗證身份及發布作品。
[能力目錄](CAPABILITY-CATALOG.md) 列出更廣的候選契約。
102 項候選操作分為 13 類。
標為 designed 的接口仍未實作。

## 設計邊界

身份、能力、作品許可及付款分開驗證。
JIC 簽名身份不等於任意資源的操作權。
委派只能降權，並保留期限與撤銷鏈。
父授權撤銷後，後繼授權也應失效。
原始碼公開不代表可以改動生產核心。

HTTP 寫入使用 Idempotency-Key。
需要更新的資源使用強 ETag 及 If-Match。
重試不能重複扣款、發布或執行外部動作。
長任務回傳可輪詢的 job。
SSE 支援事件游標，WebSocket 使用短效票。
秘密僅可寫入，讀取接口只提供中繼資料。

自定義工具也是有版本及來源的作品。
工具必須宣告輸入、輸出、能力及副作用。
執行任意代碼需要獨立沙盒及資源限制。
本版 HTML 沙盒未提供這些擴展執行能力。

付款採報價、意圖、收據及額度分階段核驗。
不能把 LOVE 份額分配接口當作 USDC 多方結算。
不提供代簽、提幣或任意轉帳接口。
目前免費額度不執行付款。

## 多語言

先支援 zh-Hant、zh-Hans、en。
讀者文案與穩定的機器識別碼分開。
作品宣告 defaultLocale 及 locales。
翻譯缺失時，明確回退至作者預設語言。

## 機器文件

- `protocol/openapi.json`：完整候選 HTTP 契約。
- `protocol/capabilities.json`：候選能力目錄。
- `protocol/mcp-tools.json`：候選 MCP 工具。
- `runtime/public/openapi.json`：首版活躍 HTTP 契約。
- `GET /v1/schema`：首版實際接受的作品格式。

離線工具驗證格式、檔案及摘要。
它不證明身份、版權、付款或運行安全。

## 0.3 立體共建

場景接口及限制見 `/scenes.md`。
三項新增 MCP 工具為 scene read、create、edit。
目前共九項活躍 MCP 工具。
版本目錄、地標回應及公開驗證另有 HTTP 接口。
候選 MCP 目錄仍不代表全部工具已上線。
