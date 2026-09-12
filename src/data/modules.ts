import { Lock, Globe, Bot, PenTool as Tool, Lightbulb, ClipboardList } from 'lucide-react';

export const modulesData = [
  {
    id: '1',
    title: 'Skill Matrix Gating',
    icon: Lock,
    color: 'accent-blue',
    hex: '#00D4FF',
    shortDesc: '員工數位證號與工站資質聯鎖',
    problem: '未經認證員工操作高風險工站，導致組裝錯誤與安規風險',
    solution: 'RFID 員工卡 → MES 查詢資質資料庫 → 聯鎖閘門開啟/拒絕',
    kpis: [
      { label: '資質錯誤', value: '-100%' },
      { label: '培訓效率', value: '+35%' },
      { label: '合規率', value: '99.8%' }
    ],
    steps: ['刷卡', '驗證', '通過/拒絕', '記錄 Log']
  },
  {
    id: '2',
    title: '動態多國語言數位 SOP',
    icon: Globe,
    color: 'accent-purple',
    hex: '#7B2FFF',
    shortDesc: '動態提示與母語看板',
    problem: '外籍員工無法閱讀中文 SOP，靠口傳導致操作落差',
    solution: '自動偵測員工語言偏好，動態切換看板語言（繁/簡/越/泰/印）',
    kpis: [
      { label: '操作錯誤', value: '-67%' },
      { label: '培訓時間', value: '-50%' },
      { label: '語言覆蓋', value: '5語言' }
    ],
    steps: ['員工登入', '語言偵測', 'SOP 渲染', '步驟確認']
  },
  {
    id: '3',
    title: 'Action AI Poka-Yoke',
    icon: Bot,
    color: 'accent-green',
    hex: '#00FF94',
    shortDesc: '動作順序與漏件 AI 監控',
    problem: '人工目視無法即時捕捉漏鎖、錯裝等細微操作失誤',
    solution: 'AI 視覺攝影機 + 動作序列模型，實時偵測 & 聲光告警',
    kpis: [
      { label: '漏件率', value: '-98%' },
      { label: '告警響應', value: '< 0.5s' },
      { label: '誤報率', value: '< 2%' }
    ],
    steps: ['攝影機擷取', 'AI 推論', '比對標準', '告警/放行']
  },
  {
    id: '4',
    title: 'Smart Torque Tools',
    icon: Tool,
    color: 'accent-blue',
    hex: '#00D4FF',
    shortDesc: '藍牙數位扭力起子連線管理',
    problem: '扭力值無數位記錄，過鎖/欠鎖問題難以追溯',
    solution: '藍牙扭力起子即時上傳扭力曲線，MES 自動判定合格/不合格',
    kpis: [
      { label: '扭力記錄率', value: '100%' },
      { label: '返工率', value: '-40%' },
      { label: '工具稼動率', value: '+20%' }
    ],
    steps: ['起子連線', '作業開始', '扭力回饋', '判定', '記錄綁定 SN']
  },
  {
    id: '5',
    title: 'PTL Pick to Light',
    icon: Lightbulb,
    color: 'accent-green',
    hex: '#00FF94',
    shortDesc: '電子標籤智慧物料揀選系統',
    problem: '人工查找料件效率低，揀料錯誤導致停線',
    solution: '電子標籤 LED 亮燈指引，確認後熄燈，自動計數核對',
    kpis: [
      { label: '揀料錯誤', value: '-95%' },
      { label: '揀料時間', value: '-30%' },
      { label: '停線次數', value: '-60%' }
    ],
    steps: ['SN 開工', '物料需求推送', 'LED 亮燈', '確認取料', '熄燈']
  },
  {
    id: '6',
    title: '無死角數位生產履歷',
    icon: ClipboardList,
    color: 'warning',
    hex: '#FF6B35',
    shortDesc: '全流程 IoT 數據綁定追蹤',
    problem: '客訴發生時需人工查閱紙本記錄，費時且缺漏',
    solution: '所有工站操作以 SN 為索引自動綁定，一鍵調閱完整履歷',
    kpis: [
      { label: '調閱時間', value: '< 30s' },
      { label: '記錄完整率', value: '100%' }
    ],
    steps: ['輸入 SN', '查詢 IoT DB', '渲染時間軸', '下載報表']
  }
];
