**MVA Executive Panel - 詳細規格與 Wireframe**

目的
- 將現有戰情室面板擴展為「可報告型（exec review）」的儀表板，支援快速切換主題、目標/實際比較、以及管理層期望的匯出與 drill‑down。

範圍（short term）
- 左側主題導航（已存在）與 Saved View
- KPI 群組切換（MVA / Quality / OEE）——已實作
- SVG/Canvas 實際圖表（折線、bar、target overlay）——已實作
- Target vs Actual 視覺化與紅線/band 標示——已實作
- Drill‑down modal：由明細表點擊進入，顯示產線詳細數據與小型趨勢圖（下一步實作）
- 回歸測試：覆蓋 navigation 與 chart_data（已擴充）

Wireframe (文字版)
- 主畫面：Topbar / Hero / Toolbar（Time, View, KPI Group）
- 左側：Executive Topics 列表（可點擊切換）
- 右側：Warroom panels（waterfall, trend, comparison, heatmap, ops）
- 明細表：每列可點擊打開 Drill‑down modal
- Drill‑down modal：上方標題（產線名稱），中間小趨勢圖（Target vs Actual），下方細項（MVA、OEE、良率、停機、alerts），底部動作按鈕（Create Action / Export PDF）

API 合約（現有 `/api/metrics` 回傳 schema 摘要）
- response.dashboard.executive_view.navigation: [{id,label,summary}]
- response.dashboard.executive_view.chart_data.target_vs_actual: [{label,target,actual,unit}]
- response.lines: array of line objects, each 包含 line_id,line_name,actual_mva,std_mva,mva_variance,roi_percent,oee,good_units,scrap_units,downtime_loss,energy_cost_per_unit,throughput_uph,alerts

互動流程
1. 使用者在 Toolbar 切換 `kpi-group`，顯示/隱藏相關 panels。
2. 點擊左側主題（navigation），更新 summary 文字並高亮。
3. 點擊明細表列會打開 Drill‑down modal，modal 從 `response.lines` 找對應 `line_id`，呈現小趨勢圖與該產線指標。
4. Modal 提供 `Export PDF` 與 `Create Action` 按鈕（Create Action 會呼叫未來的後端工單 API）。

優先實作清單（下一步）
- Drill‑down modal（前端顯示 + UI 行為） —— 立即實作
- Export snapshot PDF（client-side 或 server-side） —— 次要
- 註解/協作（threaded comments）與 Action items —— 中期
- 自動化 anomaly detection 與 NLG 摘要 —— 長期

檔案
- 規格：`run/web/mva_exec_spec.md`

