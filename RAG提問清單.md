# RAG 系統測試提問清單 (v2.0)

> 涵蓋 RAG、GraphRAG、Vision 三種模式，共 75+ 題

---

## 一、RAG 基礎檢索 (60 題)

### IT 部門 (12 題)

1. 伺服器正常運作的 SLA 目標是多少？ → 99.9% → IT_ServerMaintenancePolicy
2. 公司規定的密碼最少需要幾個字元？ → 12 → IT_InformationSecurityPolicy
3. 密碼需要每隔多久更換一次？ → 90 天 → IT_InformationSecurityPolicy
4. 公司生產環境的 VLAN 網段是什麼？ → 10.0.20.0/24 → IT_NetworkArchitectureOverview
5. P1 等級問題的回應時間是多久？ → 15 分鐘 → IT_HelpdeskSupportGuide
6. AST-004 這個資產編號的伺服器型號是什麼？ → PowerEdge R750 → IT_AssetInventory
7. IT 部門的分機號碼是多少？ → 4001 → HR_EmployeeDirectory
8. 系統備份資料需要保留多少天？ → 30 天 → IT_BackupPolicy
9. 公司遠端連線使用哪一種 VPN 協議？ → IPsec → IT_RemoteAccessPolicy
10. 公司使用的防火牆品牌是什麼？ → FortiGate → IT_NetworkSecurityStandard
11. 機房溫度應該維持在幾度到幾度之間？ → 20–25°C → IT_DataCenterOperations
12. 最高權限帳號需要每隔多久審查一次？ → 90 天 → IT_PrivilegedAccessManagement

### HR 部門 (12 題)

13. 公司的核心工時是幾點到幾點？ → 10:00–16:00 → HR_EmployeeHandbook
14. 員工第一年有幾天年假？ → 10 天 → HR_LeavePolicy
15. 公司每年補助外部訓練費用的上限是多少？ → NT$50,000 → HR_TrainingPolicy
16. 公司每個月幾號發放薪資？ → 5 號 → HR_SalaryInformation
17. HR Director 的名字是什麼？ → Wu Shu-Fen → HR_EmployeeDirectory
18. 勞健保費用是在哪一天扣款？ → 5 號 → HR_SalaryInformation
19. 新進員工的試用期是多久？ → 3 個月 → HR_EmployeeHandbook
20. 員工的喪假有幾天？ → 8 天 → HR_LeavePolicy
21. 向公司申請外部訓練，需要多久前提出申請？ → 30 天 → HR_TrainingPolicy
22. 公司一年進行幾次績效考核？ → 2 次 → HR_PerformanceReview
23. 公司的彈性上班時段是從幾點開始？ → 7:00 → HR_FlexibleWorkingPolicy
24. 員工離職需要在多久之前提出預告？ → 30 天 → HR_TerminationPolicy

### Legal 部門 (12 題)

25. 合約金額達到多少門檻時，需要同時經過法務和副總的審批？ → Legal review + VP → LEG_ContractReviewGuidelines
26. 員工離職之後，保密義務需要持續幾年？ → 3 年 → LEG_IntellectualPropertyPolicy
27. 發生個資外洩事件時，需要在幾小時內通報主管機關？ → 72 小時 → LEG_ComplianceGuide
28. 公司面臨訴訟時，需要在幾小時內通報法務部門？ → 24 小時 → LEG_LitigationManagement
29. 公司的 MSA 主服務合約最新版號是多少？ → 3.0 → LEG_ContractTemplates
30. 公司規定個人資料最多可以保留幾年？ → 5 年 → LEG_ComplianceGuide
31. 公司與供應商簽訂合約時，最長可以約定幾年？ → 3 年 → LEG_ContractReviewGuidelines
32. 員工在職期間所開發的智慧財產權，歸屬於誰？ → 公司 (IP created by employees) → LEG_IntellectualPropertyPolicy
33. 競業禁止條款的有效期限是幾年？ → 2 年 → LEG_IntellectualPropertyPolicy
34. 公司合約爭議的仲裁地點在哪裡？ → Singapore → LEG_DisputeResolution
35. 公司的機密文件總共分為幾個等級？ → 4 級 (Public / Internal / Confidential / Restricted) → LEG_DataClassificationPolicy
36. 公司每隔多久進行一次第三方稽核？ → 每年一次 (annual audit) → LEG_ComplianceGuide

### Finance 部門 (12 題)

37. 員工報銷費用需要在幾天之內提交？ → 30 天 → FIN_ExpenseReimbursementPolicy
38. 各部門的年度預算需要在哪一天之前提交？ → September 30 → FIN_BudgetPlanning
39. 公司的毛利率計算公式是什麼？ → (Revenue − COGS) / Revenue → FIN_FinancialStatementsGuide
40. 公司對供應商的標準付款條件是什麼？ → Net 30 → FIN_PaymentRequestProcess
41. 薪資福利費用的會計科目代碼是多少？ → 5100 → FIN_ChartOfAccounts
42. 應收帳款的會計科目代碼是多少？ → 1200 → FIN_ChartOfAccounts
43. 公司固定資產的折舊年限是幾年？ → 依資產類型：電腦 3 年、辦公設備 5 年、家具 7 年、建築 20 年 → FIN_FixedAssetPolicy
44. 資本支出的審批上限金額是多少？ → NT$100,000 → FIN_CapitalExpenditurePolicy
45. 折舊費用的會計科目代碼是多少？ → 6000 → FIN_ChartOfAccounts
46. 現金流量表可以分成哪三大類？ → 營業活動 / 投資活動 / 籌資活動 → FIN_FinancialStatementsGuide
47. 內部稽核的執行頻率是多久一次？ → 每季 (quarterly) → FIN_InternalAuditPolicy
48. 應付帳款的付款期限是幾天？ → 30 天 (Net 30) → FIN_PaymentRequestProcess

### Sales 部門 (12 題)

49. G7724A6 AI 伺服器的建議售價是多少？ → NT$285,000 → FIN_AI_Server_Pricing
50. 標準訂單的最快交貨天數是幾天？ → 14 天 → SALES_OrderFulfillment
51. 公司產品標準保固年限是幾年？ → 3 年 → LEG_Warranty_Terms
52. TS60-A7045 儲存伺服器的尺寸是幾 U？ → 4U → IT_MaTBC_AI_Server_Catalog
53. 大量採購達到多少數量可以享有折扣？ → 50 台 → SALES_VolumeDiscount
54. 銷售合約的標準付款條件是什麼？ → 30% 訂金 + 70% 交貨 → SALES_ContractTerms
55. 維護合約的費用佔產品價值的比例是多少？ → 15% (Basic) / 20% (Premium) / 25% (Enterprise) → SALES_MaintenanceContract
56. RMA 退貨流程需要幾個工作天處理？ → 5 天 → SALES_RMA_Policy
57. 教育訓練課程的天數是幾天？ → 3 天 (Advanced) → SALES_TrainingService
58. 延長保固的費用佔產品價值的比例是多少？ → 10% (年度) → SALES_ExtendedWarranty
59. 區域經銷商可以享有的折扣是多少？ → 20% (Authorized) → SALES_ChannelPartner
60. CDU-2000 液冷系統的冷卻能力是多少？ → 2000 kW → IT_Liquid_Cooling_Technology

---

## 二、GraphRAG 圖形增強測試 (10 題)

*啟用 GraphRAG 模式後測試，驗證知識圖譜多跳推理與跨部門關聯查詢*

61. 請說明從訂單成立到出貨的完整流程，以及每個環節涉及的部門。 → 多跳跨部門 → SALES_OrderFulfillment + FIN_PaymentRequestProcess + SALES_RMA_Policy
62. AI 伺服器 G7724A6 從接單到客戶端上線，需要經過哪些作業流程？ → 產品規格 → 定價 → 訂單 → 出貨 → 保固 → IT_MaTBC_AI_Server_Catalog + FIN_AI_Server_Pricing + LEG_Warranty_Terms
63. 公司有哪些與「時間」相關的政策要求？（例如回應時限、保留期限、通知期限等） → 跨部門彙整 → IT_HelpdeskSupportGuide + LEG_ComplianceGuide + LEG_LitigationManagement + IT_BackupPolicy
64. 員工入職到離職的完整生命週期中，會接觸到哪些公司政策？ → HR 流程串聯 → HR_EmployeeHandbook + HR_LeavePolicy + HR_TrainingPolicy + HR_PerformanceReview + HR_TerminationPolicy
65. 如果發生個資外洩事件，公司有哪些相關的應變流程和政策？ → 資安 + 法遵 → LEG_ComplianceGuide + IT_NetworkSecurityStandard + LEG_LitigationManagement
66. 公司產品保固結束之後，客戶還有哪些方式可以繼續獲得支援？ → 保固 → 維護合約 → 延長保固 → LEG_Warranty_Terms + SALES_MaintenanceContract + SALES_ExtendedWarranty
67. 哪些因素會影響 AI 伺服器 G7724A6 的最終售價？ → 定價 + 折扣 + 保固選擇 → FIN_AI_Server_Pricing + SALES_VolumeDiscount + SALES_ExtendedWarranty
68. 公司的網路安全架構涵蓋哪些層面？ → 防火牆 → VLAN → VPN → 監控 → IT_NetworkSecurityStandard + IT_NetworkArchitectureOverview + IT_RemoteAccessPolicy
69. 請列出所有需要「每年」或「每季」執行的合規事項。 → 週期性事件彙整 → LEG_ComplianceGuide + IT_PrivilegedAccessManagement + FIN_InternalAuditPolicy + HR_PerformanceReview
70. CDU-2000 液冷方案要順利部署，需要滿足哪些機房基礎設施條件？ → 冷卻 + 電力 + 空間 + 環境 → IT_Liquid_Cooling_Technology + IT_DataCenterOperations

---

## 三、Vision PDF 分析測試 (5 項)

*上傳 PDF 檔案測試 Vision 分析功能，驗證 OCR 擷取與版面理解*

| 項目 | 測試檔案 | 預期驗證重點 |
|------|---------|-------------|
| V1 | FIN_ExpenseReimbursementPolicy.pdf | 報銷流程、天數限制、審批層級 |
| V2 | LEG_ContractReviewGuidelines.pdf | 合約審查門檻、法務與 VP 共同簽核條件 |
| V3 | HR_EmployeeHandbook.pdf | 工時規定、試用期、請假規則 |
| V4 | IT_ServerMaintenancePolicy.pdf | SLA 目標 99.9%、維護窗口、回應時間 |
| V5 | 上傳非 PDF 檔案 (如 .txt / .docx) | 系統應提示僅接受 PDF 格式 |

---

## 四、邊界與異常測試 (6 題)

*驗證系統容錯與邊界處理能力*

| 編號 | 測試項目 | 預期行為 |
|------|---------|---------|
| E1 | 輸入空字串提問 | 不發送請求或回覆請輸入問題 |
| E2 | 輸入超長問題 (>500 字) | 正常處理不被截斷 |
| E3 | 併發提問 (快速連續輸入) | 依序處理，不回覆錯亂 |
| E4 | 問題包含特殊字元 (SQL injection / XSS 嘗試) | 安全處理，不執行惡意指令 |
| E5 | 存取不存在的 API 路徑 (如 /api/xxx) | 回覆 404 錯誤 |
| E6 | 查詢不存在於任何文件中的主題（如"月球基地建設計畫"） | 禮貌告知無相關資訊，不提幻觉回答 |

---

> **更新紀錄**
> - v2.0: 新增 GraphRAG (10 題)、Vision (5 項)、邊界測試 (6 題)；修正 Q11 / Q35 / Q52 答案錯誤；補充模糊答案為明確範圍
