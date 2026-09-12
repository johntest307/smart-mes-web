export interface SimMetric {
  label: string;
  value: number;
  unit: string;
  max?: number;
  color?: string;
}

export interface StarEntry {
  situation: string;
  task: string;
  action: string;
  result: string;
  resultMetrics: SimMetric[];
  roi: string;
  roiMetrics: SimMetric[];
  coverage: string;
  coverageMetrics: SimMetric[];
  simulator: string;
  simMetrics: SimMetric[];
  overallBenefit: string;
  overallMetrics: SimMetric[];
}

export const starContent: StarEntry[] = [
  // 0 — RFID 員工資質聯鎖
  {
    situation: '產線員工資格認定缺乏自動化把關，未經認證人員操作高風險工站，導致組裝錯誤與安規風險',
    task: '建立 RFID 員工卡與 MES 資質資料庫即時聯鎖機制，確保只有合格人員才能操作對應工站',
    action: '導入 RFID 讀卡器、開發 MES 資質驗證 API、工站聯鎖閘門邏輯控制，串接人事系統自動同步',
    result: '資質錯誤降為 0%，培訓效率提升 35%，合規率達 99.8%，全年零工安事故',
    resultMetrics: [
      { label: '資質錯誤率', value: 0, unit: '%', max: 100, color: '#5BA87A' },
      { label: '培訓效率提升', value: 35, unit: '%', max: 100, color: '#4A90C7' },
      { label: '合規率', value: 99.8, unit: '%', max: 100, color: '#5BA87A' },
    ],
    roi: '年省人力成本 NT$120 萬（減少品保巡檢人力 2 人）；避免安規罰款 NT$50-200 萬/次；投資回收期 8 個月',
    roiMetrics: [
      { label: '年省人力成本', value: 120, unit: '萬', max: 300, color: '#5BA87A' },
      { label: '避免罰款', value: 200, unit: '萬/次', max: 300, color: '#E8A838' },
      { label: '投資回收期', value: 8, unit: '個月', max: 24, color: '#4A90C7' },
    ],
    coverage: '適用範圍：全部產線工站（覆蓋率 92%）；同業實現率 85%（汽車電子、医疗器械行業已廣泛導入）',
    coverageMetrics: [
      { label: '覆蓋率', value: 92, unit: '%', max: 100, color: '#5BA87A' },
      { label: '同業實現率', value: 85, unit: '%', max: 100, color: '#C9975E' },
    ],
    simulator: 'Simulator 模擬 1,200 筆員工排班場景：聯鎖觸發準確率 99.97%；誤判率 0.03%；平均驗證延遲 <120ms',
    simMetrics: [
      { label: '聯鎖觸發準確率', value: 99.97, unit: '%', max: 100, color: '#5BA87A' },
      { label: '誤判率', value: 0.03, unit: '%', max: 1, color: '#D9534F' },
      { label: '平均驗證延遲', value: 120, unit: 'ms', max: 500, color: '#4A90C7' },
    ],
    overallBenefit: '建立「人」的數位資質管控屏障，從源頭杜絕無資質操作風險，合規成本降低 60%，同時為企業打造 ISO/IATF 審計的數位化證據鏈',
    overallMetrics: [
      { label: '合規成本降低', value: 60, unit: '%', max: 100, color: '#5BA87A' },
    ],
  },
  // 1 — 多語 SOP
  {
    situation: '外籍員工佔產線 30% 以上，無法閱讀中文 SOP，依賴口頭傳達導致操作誤差與品質不穩',
    task: '建置動態多國語言數位 SOP 系統，支援自動語言偵測與即時切換，降低語言隔閡',
    action: '開發語言偏好偵測機制、多語言 SOP 模板引擎、看板即時渲染系統，支援繁/簡/越/泰/印 5 語',
    result: '操作錯誤降低 67%，培訓時間縮短 50%，覆蓋 5 種語言，外籍員工獨立上線時間縮短 70%',
    resultMetrics: [
      { label: '操作錯誤降低', value: 67, unit: '%', max: 100, color: '#5BA87A' },
      { label: '培訓時間縮短', value: 50, unit: '%', max: 100, color: '#4A90C7' },
      { label: '上線時間縮短', value: 70, unit: '%', max: 100, color: '#5BA87A' },
    ],
    roi: '年省培訓成本 NT$80 萬（縮短帶訓天數 50%）；減少操作錯誤賠償 NT$60 萬/年；投資回收期 6 個月',
    roiMetrics: [
      { label: '年省培訓成本', value: 80, unit: '萬', max: 200, color: '#5BA87A' },
      { label: '減少錯誤賠償', value: 60, unit: '萬/年', max: 200, color: '#E8A838' },
      { label: '投資回收期', value: 6, unit: '個月', max: 24, color: '#4A90C7' },
    ],
    coverage: '適用範圍：全部產線工站 SOP（覆蓋率 95%）；同業實現率 82%（跨國製造企業普遍有需求）',
    coverageMetrics: [
      { label: '覆蓋率', value: 95, unit: '%', max: 100, color: '#5BA87A' },
      { label: '同業實現率', value: 82, unit: '%', max: 100, color: '#C9975E' },
    ],
    simulator: 'Simulator 模擬 5 語言 500 頁 SOP 切換：切換延遲 <0.3 秒；渲染正確率 100%；多語並發載入無卡頓',
    simMetrics: [
      { label: '切換延遲', value: 0.3, unit: 's', max: 2, color: '#4A90C7' },
      { label: '渲染正確率', value: 100, unit: '%', max: 100, color: '#5BA87A' },
      { label: '支援語言數', value: 5, unit: '語', max: 10, color: '#C9975E' },
    ],
    overallBenefit: '打破語言 barrier，讓外籍員工與本地員工享有同等作業標準，品質一致性提升 45%，降低因語言導致的客訴 70%',
    overallMetrics: [
      { label: '品質一致性提升', value: 45, unit: '%', max: 100, color: '#5BA87A' },
      { label: '語言客訴降低', value: 70, unit: '%', max: 100, color: '#4A90C7' },
    ],
  },
  // 2 — AI 視覺檢測
  {
    situation: '人工目視檢驗無法即時捕捉漏鎖、錯裝等細微操作失誤，不良品流出至下游工站造成連鎖報廢',
    task: '導入 AI 視覺辨識系統，即時監控組裝動作序列與零件漏裝，異常時立即聲光告警',
    action: '架設 AI 攝影機、訓練動作序列模型、開發聲光告警整合機制，串接 MES 鎖定不良品',
    result: '漏件率降低 98%，告警響應 < 0.5 秒，誤報率 < 2%，每年減少報廢成本達 NT$ 300 萬',
    resultMetrics: [
      { label: '漏件率降低', value: 98, unit: '%', max: 100, color: '#5BA87A' },
      { label: '告警響應', value: 0.5, unit: 's', max: 3, color: '#4A90C7' },
      { label: '誤報率', value: 2, unit: '%', max: 10, color: '#E8A838' },
    ],
    roi: '年省報廢成本 NT$300 萬；減少客訴賠償 NT$150 萬；投資回收期 10 個月',
    roiMetrics: [
      { label: '年省報廢成本', value: 300, unit: '萬', max: 500, color: '#5BA87A' },
      { label: '減少客訴賠償', value: 150, unit: '萬', max: 500, color: '#E8A838' },
      { label: '投資回收期', value: 10, unit: '個月', max: 24, color: '#4A90C7' },
    ],
    coverage: '適用範圍：高風險組裝工站（覆蓋率 88%）；同業實現率 80%（消費電子組裝已大量導入）',
    coverageMetrics: [
      { label: '覆蓋率', value: 88, unit: '%', max: 100, color: '#5BA87A' },
      { label: '同業實現率', value: 80, unit: '%', max: 100, color: '#C9975E' },
    ],
    simulator: 'Simulator 模擬 10,000 筆組裝影像：漏件偵測準確率 99.2%；平均推理時間 180ms；誤報率 1.8%',
    simMetrics: [
      { label: '漏件偵測準確率', value: 99.2, unit: '%', max: 100, color: '#5BA87A' },
      { label: '平均推理時間', value: 180, unit: 'ms', max: 500, color: '#4A90C7' },
      { label: '誤報率', value: 1.8, unit: '%', max: 10, color: '#E8A838' },
    ],
    overallBenefit: '以 AI 取代人眼，實現 100% 全檢而非抽檢，將品質管控從「事後補救」提升為「即時攔截」，每年避免 NT$450 萬以上的損失',
    overallMetrics: [
      { label: '每年避免損失', value: 450, unit: '萬', max: 600, color: '#5BA87A' },
    ],
  },
  // 3 — 扭力工具
  {
    situation: '扭力值全靠人工記錄，過鎖/欠鎖問題無法追溯，返工成本居高不下，客戶稽核缺乏數位證據',
    task: '建立藍牙扭力起子數位化管理，實現扭力數據即時上傳、自動判定與 SN 綁定追溯',
    action: '導入藍牙扭力起子、開發扭力曲線分析演算法、MES 自動判定系統，數據綁定至產品 SN',
    result: '扭力記錄率達 100%，返工率降低 40%，工具稼動率提升 20%，客戶稽核通過率 100%',
    resultMetrics: [
      { label: '扭力記錄率', value: 100, unit: '%', max: 100, color: '#5BA87A' },
      { label: '返工率降低', value: 40, unit: '%', max: 100, color: '#4A90C7' },
      { label: '工具稼動率提升', value: 20, unit: '%', max: 100, color: '#C9975E' },
      { label: '稽核通過率', value: 100, unit: '%', max: 100, color: '#5BA87A' },
    ],
    roi: '年省返工成本 NT$200 萬；工具管理成本降低 NT$50 萬；投資回收期 9 個月',
    roiMetrics: [
      { label: '年省返工成本', value: 200, unit: '萬', max: 400, color: '#5BA87A' },
      { label: '工具管理降低', value: 50, unit: '萬', max: 400, color: '#E8A838' },
      { label: '投資回收期', value: 9, unit: '個月', max: 24, color: '#4A90C7' },
    ],
    coverage: '適用範圍：所有扭力鎖附工站（覆蓋率 90%）；同業實現率 88%（汽車、電子製造已為標配）',
    coverageMetrics: [
      { label: '覆蓋率', value: 90, unit: '%', max: 100, color: '#5BA87A' },
      { label: '同業實現率', value: 88, unit: '%', max: 100, color: '#C9975E' },
    ],
    simulator: 'Simulator 模擬 5,000 筆扭力曲線：過鎖/欠鎖判斷準確率 99.5%；異常曲線偵測率 98.8%；資料上傳延遲 <200ms',
    simMetrics: [
      { label: '過鎖/欠鎖判斷準確率', value: 99.5, unit: '%', max: 100, color: '#5BA87A' },
      { label: '異常曲線偵測率', value: 98.8, unit: '%', max: 100, color: '#4A90C7' },
      { label: '資料上傳延遲', value: 200, unit: 'ms', max: 500, color: '#E8A838' },
    ],
    overallBenefit: '每一顆螺絲都有數位身分證，客戶稽核從「翻箱倒櫃」變為「一鍵匯出」，扭力合規率 100%，年省 NT$250 萬以上',
    overallMetrics: [
      { label: '扭力合規率', value: 100, unit: '%', max: 100, color: '#5BA87A' },
      { label: '年省成本', value: 250, unit: '萬', max: 400, color: '#4A90C7' },
    ],
  },
  // 4 — 智慧揀料
  {
    situation: '人工揀料效率低落，料件錯誤導致產線停線，影響生產節拍與訂單達交率',
    task: '導入電子標籤智慧揀料系統，以 LED 亮燈指引取代人工查找，降低揀錯率與等待時間',
    action: '建置電子標籤硬體、開發物料需求推送邏輯、確認取料流程自動化，串接 ERP 庫存即時更新',
    result: '揀料錯誤降低 95%，揀料時間縮短 30%，停線次數減少 60%，產能提升 15%',
    resultMetrics: [
      { label: '揀料錯誤降低', value: 95, unit: '%', max: 100, color: '#5BA87A' },
      { label: '揀料時間縮短', value: 30, unit: '%', max: 100, color: '#4A90C7' },
      { label: '停線次數減少', value: 60, unit: '%', max: 100, color: '#5BA87A' },
      { label: '產能提升', value: 15, unit: '%', max: 100, color: '#C9975E' },
    ],
    roi: '年省停線損失 NT$180 萬；揀料人力效率提升 30%（年省 NT$90 萬）；投資回收期 7 個月',
    roiMetrics: [
      { label: '年省停線損失', value: 180, unit: '萬', max: 400, color: '#5BA87A' },
      { label: '年省人力成本', value: 90, unit: '萬', max: 400, color: '#E8A838' },
      { label: '投資回收期', value: 7, unit: '個月', max: 24, color: '#4A90C7' },
    ],
    coverage: '適用範圍：全部倉儲揀料區（覆蓋率 93%）；同業實現率 83%（電子、汽車零件倉已普遍導入）',
    coverageMetrics: [
      { label: '覆蓋率', value: 93, unit: '%', max: 100, color: '#5BA87A' },
      { label: '同業實現率', value: 83, unit: '%', max: 100, color: '#C9975E' },
    ],
    simulator: 'Simulator 模擬 2,000 筆揀料訂單：亮燈指引準確率 99.8%；平均揀料時間從 45 秒降至 28 秒；錯料率 0.2%',
    simMetrics: [
      { label: '亮燈指引準確率', value: 99.8, unit: '%', max: 100, color: '#5BA87A' },
      { label: '揀料時間改善', value: 28, unit: 's', max: 60, color: '#4A90C7' },
      { label: '錯料率', value: 0.2, unit: '%', max: 5, color: '#D9534F' },
    ],
    overallBenefit: '以光取代人腦判斷，揀料效率提升 40%，停線損失降低 60%，訂單達交率從 92% 提升至 98%，年省 NT$270 萬',
    overallMetrics: [
      { label: '揀料效率提升', value: 40, unit: '%', max: 100, color: '#5BA87A' },
      { label: '停線損失降低', value: 60, unit: '%', max: 100, color: '#4A90C7' },
      { label: '訂單達交率', value: 98, unit: '%', max: 100, color: '#5BA87A' },
    ],
  },
  // 5 — SN 追溯
  {
    situation: '客訴發生時需人工翻查紙本記錄，耗時 2-3 天且資料缺漏嚴重，無法快速回應客戶',
    task: '建立全流程 IoT 數據綁定追蹤系統，以 SN 為索引串聯所有工站數據，實現一鍵調閱',
    action: '開發 SN 綁定引擎、IoT 數據收集管道、時間軸查詢介面，覆蓋組裝/測試/包裝全流程',
    result: '履歷調閱時間 < 30 秒，記錄完整率達 100%，客訴處理時間縮短 95%，客戶滿意度提升 40%',
    resultMetrics: [
      { label: '調閱時間', value: 30, unit: 's', max: 120, color: '#4A90C7' },
      { label: '記錄完整率', value: 100, unit: '%', max: 100, color: '#5BA87A' },
      { label: '客訴處理縮短', value: 95, unit: '%', max: 100, color: '#5BA87A' },
      { label: '滿意度提升', value: 40, unit: '%', max: 100, color: '#C9975E' },
    ],
    roi: '年省客訴處理人力 NT$60 萬；減少客訴賠償 NT$100 萬（快速定位根因）；投資回收期 6 個月',
    roiMetrics: [
      { label: '年省處理人力', value: 60, unit: '萬', max: 200, color: '#5BA87A' },
      { label: '減少客訴賠償', value: 100, unit: '萬', max: 200, color: '#E8A838' },
      { label: '投資回收期', value: 6, unit: '個月', max: 24, color: '#4A90C7' },
    ],
    coverage: '適用範圍：全流程所有工站（覆蓋率 96%）；同業實現率 86%（醫療、汽車電子為法規強制要求）',
    coverageMetrics: [
      { label: '覆蓋率', value: 96, unit: '%', max: 100, color: '#5BA87A' },
      { label: '同業實現率', value: 86, unit: '%', max: 100, color: '#C9975E' },
    ],
    simulator: 'Simulator 模擬 3,000 筆 SN 查詢：查詢回應時間 <15 秒；資料完整率 100%；時間軸串聯成功率 99.9%',
    simMetrics: [
      { label: '查詢回應時間', value: 15, unit: 's', max: 60, color: '#4A90C7' },
      { label: '資料完整率', value: 100, unit: '%', max: 100, color: '#5BA87A' },
      { label: '時間軸串聯成功率', value: 99.9, unit: '%', max: 100, color: '#C9975E' },
    ],
    overallBenefit: '從「人找資料」變為「資料找人」，客訴回應從 3 天縮為 30 分鐘，客戶信任度大幅提升，年省 NT$160 萬以上',
    overallMetrics: [
      { label: '客訴回應縮短', value: 95, unit: '%', max: 100, color: '#5BA87A' },
      { label: '年省成本', value: 160, unit: '萬', max: 300, color: '#4A90C7' },
    ],
  },
];

export const videoToModule: Record<string, number> = {
  '/arch/1.mp4': 0,
  '/arch/2.mp4': 1,
  '/arch/3.mp4': 2,
  '/arch/4.mp4': 3,
  '/arch/5.mp4': 4,
  '/arch/6.mp4': 5,
};
