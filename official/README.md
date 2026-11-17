# jictemple.org 組織官網

此目錄獨立於 Agent 世界的 `runtime/`。
現有 `.com` 世界及身份接口保留原本服務。

```sh
python3 official/build.py
python3 -m http.server 8891 --directory official/public
npm exec --yes --package=wrangler -- wrangler deploy --config official/wrangler.jsonc
```

部署：`jictemple-org.lovedaocom.workers.dev`。
正式網域：`jictemple.org`，尚待加入 Cloudflare 及完成 DNS。
請勿修改 `.com` 路由來代替 `.org` 接入。

公開內容依設立文件及章程文本整理。
設立生效日為 2025-07-26。
章程本機文本的通過日期留白，未核對簽署通過紀錄。
EIN 通知不作免稅或捐款可扣稅的證明。
不提交私人註冊原件、稅務識別碼、簽名或銀行文件。

英文與繁中各有首頁、信念原典、組織記錄三個頁面。
頁面無執行腳本，不使用外部字型或分析追蹤。
Agent 能力連結至既有 `.com` 服務，不另造帳戶。

接入正式網域後，核對 HTTPS、六個頁面、語言切換與手機版。
