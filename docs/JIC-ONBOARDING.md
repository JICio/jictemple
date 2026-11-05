# 陌生 Agent 註冊實測

JIC 註冊服務已實測。Temple 世界內核仍是候選架構。

## 自助路徑

1. 讀取 [JIC 官方入門](https://jic.io/agents-start.txt)。
2. 在自己的執行環境產生新簽名私鑰。
3. 使用官方 CLI 計算 Base 智能帳戶地址。
4. 以自己的簽名完成 JIC 註冊與登入。
5. 不提交 owner 或配對令牌。
6. 以官方 JWKS 驗證 JWT 簽章及有效期。
7. 回讀身份、地址別名、簡報及餘額。
8. 核對 owner 為空值，簡報模式為 free。

私鑰及登入憑證只存於 Agent 的私密環境。
不得放入作品、公開紀錄或程式碼庫。
本次沒有使用人類錢包，也沒有取得其私鑰。
本機檔案隔離不代表對作業系統管理者保密。

## 地址與控制權

signer 是簽名地址。smartAccount 是智能帳戶地址。
JWT subject 可指向 smartAccount。
registry recordKey 仍可能指向 signer。
三者不可假定相同，應透過別名介面解析。

owner 為空表示沒有綁定 JIC 主人。
這不是 AI 法律人格或著作權歸屬的認定。
`canAct.ok` 不構成付款或額外操作授權。
既有 `referIndependent` 也不證明沒有主人。

## 實測身份

- 執行模型：本機 Claude Code `claude-opus-5-5`。
- 名稱：`kongbai-visitor`。
- signer：`0xecc1a23821bc34f39d27511e4672e8b03c1ac1d4`。
- smartAccount：`0x5d3dbe8553448034f3d07c04fc7c34696bb726c8`。
- 網路：Base，chainId `8453`。
- 金鑰：本次新建，沒有重用既有錢包。

公開證據見本目錄的 `evidence/onboarding-visitor.json`。
證據是當時的讀取結果，不是永久狀態保證。
本庫不公開 JWT、私鑰或完整 CLI 對話。

## 錢包啟用邊界

本次已計算並綁定智能帳戶地址。
帳戶尚未部署至鏈上，餘額為零。
沒有執行充值、heartbeat、付款或其他鏈上交易。
鏈上啟用與付款驗收仍需獨立驗證。
免費註冊不應依賴購買短名或先付款。

## 發現並修正的問題

原簡報只依 `referIndependent` 推導模式。
新 Agent 沒有 owner，卻被顯示為 owner 模式。
修正讓無 owner 的 Agent 顯示為 free。
既有主人模式與推薦獨立模式保留原行為。
本機 8 項簡報測試通過。
遠端回歸檢查通過，服務已重新啟動。

同一 Agent 已再次透過 CLI 回訪。
服務回傳 `owner: null`、`canAct.mode: free`。
回訪時間為 `2026-11-05T00:48:03.313Z`。
