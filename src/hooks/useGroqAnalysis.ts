import { useState, useEffect, useRef } from 'react';

export interface StationAnalysis {
  station: string;
  averageLevel: number;
  hasQualified: boolean;
  hasMaster: boolean;
  assessment: string;
}

export interface GapItem {
  type: 'high' | 'medium' | 'low';
  description: string;
  affectedStations: string[];
}

export interface ComputedStats {
  levelCounts: number[];
  total: number;
  seniorCount: number;
  apprenticeCount: number;
  stationAvgs: { station: string; avg: number; noQualified: boolean; hasMaster: boolean }[];
}

export interface SkillAnalysisReport {
  summary: { totalCertifications: number; certificationRate: string; seniorCount: number; seniorPct: string; apprenticeCount: number; apprenticePct: string };
  levelDistribution: { level: number; label: string; count: number; percentage: string }[];
  seniorApprenticeRatio: { ratio: string; assessment: string };
  stationAnalysis: StationAnalysis[];
  gaps: GapItem[];
  conclusion: string;
}

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const API_KEY = 'gsk_YOUR_API_KEY_HERE';
const MODEL = 'llama-3.3-70b-versatile';

function buildPrompt(matrix: { employeeId: string; station: string; level: number }[][], stats: ComputedStats): string {
  const levelLabels = ['未認證', '見習', '合格', '熟練', '師傅'];
  const rows = matrix.map(row => {
    const levels = row.map(c => `${c.station}:${c.level}(${levelLabels[c.level]})`).join(', ');
    return `${row[0].employeeId}: ${levels}`;
  }).join('\n');

  const levelDistStr = stats.levelCounts.map((c, i) => `  ${i}(${levelLabels[i]}): ${c}人`).join('\n');
  const stationStr = stats.stationAvgs.map(s => `  ${s.station}: avg=${s.avg.toFixed(1)}, qualified=${!s.noQualified}, master=${s.hasMaster}`).join('\n');

  return `You are a manufacturing skill matrix analyst. Output ALL text in Traditional Chinese.

SKILL MATRIX DATA:
${rows}

CORRECT COMPUTED STATISTICS (use these exact numbers, do NOT recalculate):
Level Distribution:
${levelDistStr}

Station Averages:
${stationStr}

Total: ${stats.total} cells, Senior(3+4): ${stats.seniorCount}, Apprentice(1): ${stats.apprenticeCount}

LEVEL DEFINITIONS:
0 = 未認證(不具備資格), 1 = 見習(需指導), 2 = 合格(可獨立), 3 = 熟練(可指導), 4 = 師傅(專家)

ASSESSMENT CRITERIA:
- Station avg: >=2.5 good, 1.5-2.4 fair, <1.5 low
- Senior/apprentice ratio >=1.5 = healthy, 1.0-1.49 = caution, <1.0 = high risk

Output the CORRECT statistics in the summary and levelDistribution fields.
The "assessment" and "conclusion" fields must be your analysis in Traditional Chinese.

CONCLUSION RULES:
- Write 4-6 sentences, 150-250 characters total, professional report style
- Cover: (1) overall level assessment with average grade (2) biggest gaps with station names (3) senior/apprentice ratio analysis (4) specific actionable recommendations
- Each sentence must contain a unique data point (number, station, percentage)
- NO generic phrases like "根據分析結果" or "整體而言"
- Be direct, factual, specific. Example: "全廠平均等級1.8，偏低，僅5%人員達師傅級。ST-01與ST-03無合格人員，需立即培訓。資深/見習比1:3，傳承斷層風險高。建議每站至少配置1名熟練級以上人員。"
- DO NOT repeat facts already stated in the summary or levelDistribution

Return ONLY JSON (no markdown):
{
  "summary": { "totalCertifications": <correct number>, "certificationRate": "<correct>", "seniorCount": <correct>, "seniorPct": "<correct>", "apprenticeCount": <correct>, "apprenticePct": "<correct>" },
  "levelDistribution": [
    { "level": 0, "label": "未認證", "count": <correct>, "percentage": "<correct>" },
    { "level": 1, "label": "見習", "count": <correct>, "percentage": "<correct>" },
    { "level": 2, "label": "合格", "count": <correct>, "percentage": "<correct>" },
    { "level": 3, "label": "熟練", "count": <correct>, "percentage": "<correct>" },
    { "level": 4, "label": "師傅", "count": <correct>, "percentage": "<correct>" }
  ],
  "seniorApprenticeRatio": { "ratio": "<correct>", "assessment": "<TC assessment>" },
  "stationAnalysis": [ { "station": "ST-01", "averageLevel": <correct>, "hasQualified": <correct>, "hasMaster": <correct>, "assessment": "<TC>" } ],
  "gaps": [ { "type": "high|medium|low", "description": "<TC>", "affectedStations": ["ST-01"] } ],
  "conclusion": "<TC, 4-6 sentences, 150-250 chars, cover overall+gap+ratio+recommendation>"
}`;
}

export function useGroqAnalysis(matrix: { employeeId: string; station: string; level: number }[][], enabled: boolean, stats: ComputedStats) {
  const [report, setReport] = useState<SkillAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!enabled || calledRef.current) return;
    calledRef.current = true;
    setLoading(true);

    fetch(GROQ_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: buildPrompt(matrix, stats) }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const parsed = JSON.parse(data.choices[0].message.content) as SkillAnalysisReport;
        // Override numerical fields with computed stats to prevent hallucination
        const pct = (n: number) => ((n / stats.total) * 100).toFixed(1) + '%';
        parsed.summary = {
          totalCertifications: stats.total - stats.levelCounts[0],
          certificationRate: pct(stats.total - stats.levelCounts[0]),
          seniorCount: stats.seniorCount,
          seniorPct: pct(stats.seniorCount),
          apprenticeCount: stats.apprenticeCount,
          apprenticePct: pct(stats.apprenticeCount),
        };
        parsed.levelDistribution = stats.levelCounts.map((count, level) => ({
          level,
          label: ['未認證', '見習', '合格', '熟練', '師傅'][level],
          count,
          percentage: pct(count),
        }));
        parsed.stationAnalysis = stats.stationAvgs.map(s => ({
          station: s.station,
          averageLevel: parseFloat(s.avg.toFixed(1)),
          hasQualified: !s.noQualified,
          hasMaster: s.hasMaster,
          assessment: parsed.stationAnalysis.find(a => a.station === s.station)?.assessment || '',
        }));
        const sr = parsed.seniorApprenticeRatio;
        parsed.seniorApprenticeRatio = {
          ratio: `${stats.seniorCount}:${stats.apprenticeCount}`,
          assessment: sr?.assessment || '',
        };
        setReport(parsed);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [enabled, matrix, stats]);

  return { report, loading, error };
}
