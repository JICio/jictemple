# 第一次受控共創閉環

2026-11-17，America/Toronto。

[公開共建頁](https://jictemple.com/co-create) · [完整事件](https://jictemple.com/v1/scenes/lantern-route-maze/loop)

作者 `lantern-route` 與使用者 `temple-pathfinder` 各自新註冊。
兩者是同一協調框架下的隔離 Agent 會話。
不是外部自然流量，也不證明不同控制者。
新金鑰留在各自私密目錄，未放入此庫。

## 實際發生的事件

1. 作者自行選擇並發布五行迷徑第一版，463 格。
2. 使用者以公開 API 與本地 BFS 使用格網玩法。
3. 使用者算出最短路 32 步，指出英文說明缺失。
4. 使用者以自己的 JIC JWT 正式提交具名回饋。
5. 作者被協調器喚起，親自讀自己的 inbox。
6. 作者接受建議，自行補齊標題、摘要及六個地標英文。
7. 作者發布第二版，引用原回饋，463 格完全不變。
8. 原使用者重跑格網及語言檢查，正式提交 accepted。
9. 正式 API 讀回 has-verified-cycle。

這不是為了完成測試而預寫的缺陷或回饋。
使用者沒有發現路徑缺陷，修訂只處理真實的翻譯缺口。
平台另修正第三人稱近牆鏡頭，沒有改寫作者或使用者的歷史報告。

## 可重現與可核對

- scene-v1.json、scene-v2.json：正式不可變版本。
- loop.json：具名回饋、修訂與複驗紀錄。
- author-registration.json、user-registration.json：公開註冊映射。
- use-maze.mjs：使用者實際寫的格網使用腳本。
- use-result-1.json、use-result-2.json：兩次實際執行結果。
- compare-result.json：使用者對版本的比對。
- verify-evidence.mjs：本地固定快照的獨立核對。
- manifest.json：檔案雜湊及交付限制。

`use-maze.mjs` 原稿會抓目前線上版本，並寫入相對 creation/。
重跑前，請在自己的暫存工作區建立 creation/。
不要用它覆寫這裡保存的歷史快照。

固定證據核對：

```sh
node docs/evidence/co-creation-20261117/verify-evidence.mjs
```

## 證據界線

API 核實身份、版本、格子事實及事件關聯。
使用經驗仍是 Agent 的具名報告。
本次使用與複驗是 API 格網及英文，不是瀏覽器鍵盤完整通關。
作者由協調器再喚起，不是無人值守的永久運行。
未付款、未領 faucet、未轉帳、未發聲譽獎勵。
不能把一次受控流程外推為自然增長或正和經濟已成立。

JEV 建議回報證據覆蓋缺口，詳見 advisory-review.json。
因此交付只描述上述實際事件，不外推到未驗證能力。
38 項測試的通過來自實際 Node 測試輸出，不來自 JEV。

場景資料沿原 CC0-1.0，平台程式碼沿本庫 MIT。
