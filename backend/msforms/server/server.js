const express = require("express");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");
const CONFIG_PATH = path.join(__dirname, "data", "config.json");
const FORM_IDS_PATH = path.join(ROOT, "form-ids.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

function getLatestXlsx() {
  if (!fs.existsSync(OUTPUT_DIR)) return null;
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith("FormsExport_") && f.endsWith(".xlsx"))
    .sort().reverse();
  return files.length > 0 ? path.join(OUTPUT_DIR, files[0]) : null;
}

async function parseXlsxData() {
  const xlsxPath = getLatestXlsx();
  if (!xlsxPath) return { quizzes: {}, file: null };

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const quizzes = {};

  for (const ws of wb.worksheets) {
    const headers = [];
    const hRow = ws.getRow(1);
    hRow.eachCell((cell, colNum) => { headers[colNum] = String(cell.value || ""); });

    const nameCol = headers.findIndex(h => h === "姓名");
    const deptCol = headers.findIndex(h => h === "部門");
    const empIdCol = headers.findIndex(h => h === "工號");
    const scoreCol = headers.findIndex(h => h === "分數");
    const timeCol = headers.findIndex(h => h === "提交時間");

    const responses = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const vals = row.values;
      const name = nameCol ? String(vals[nameCol] || "").trim() : "";
      if (!name) return;

      const dept = deptCol ? String(vals[deptCol] || "").trim() : "";
      const empId = empIdCol ? String(vals[empIdCol] || "").trim() : "";
      const time = timeCol ? String(vals[timeCol] || "").trim() : "";

      let scoreNum = 0, scoreTotal = 0;
      if (scoreCol && vals[scoreCol]) {
        const scoreStr = String(vals[scoreCol]);
        const m = scoreStr.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) { scoreNum = parseInt(m[1]); scoreTotal = parseInt(m[2]); }
      }

      const answerCols = {};
      for (let i = 1; i < headers.length; i++) {
        const h = headers[i];
        if (h && h !== "提交時間" && h !== "姓名" && h !== "部門" && h !== "工號" && h !== "分數") {
          answerCols[h] = String(vals[i] || "");
        }
      }

      responses.push({ name, dept, empId, time, scoreNum, scoreTotal, answers: answerCols });
    });

    quizzes[ws.name] = { responses, headers };
  }

  return { quizzes, file: path.basename(xlsxPath) };
}

// API: Get all quizzes overview
app.get("/api/quizzes", async (req, res) => {
  try {
    const config = loadConfig();
    const { quizzes, file } = await parseXlsxData();
    const formMap = JSON.parse(fs.readFileSync(FORM_IDS_PATH, "utf8"));

    const result = Object.keys(formMap).map(title => {
      const quizData = quizzes[title] || { responses: [] };
      // Deduplicate: keep latest response per employee (by empId)
      const seen = new Map();
      for (const r of quizData.responses) {
        const key = r.empId || r.name;
        if (!seen.has(key)) seen.set(key, r);
        else {
          const existing = seen.get(key);
          if (r.time > existing.time) seen.set(key, r);
        }
      }
      const responses = [...seen.values()];
      const required = config.requiredByQuiz[title] || 8;
      const deptCount = {};
      let totalScore = 0, scoredCount = 0, passedCount = 0;
      const passingThreshold = (config.passingScorePercent || 60) / 100;

      for (const r of responses) {
        deptCount[r.dept] = (deptCount[r.dept] || 0) + 1;
        if (r.scoreTotal > 0) {
          totalScore += r.scoreNum;
          scoredCount++;
          if (r.scoreNum / r.scoreTotal >= passingThreshold) passedCount++;
        }
      }

      return {
        title,
        formId: formMap[title],
        submitted: responses.length,
        required,
        completionPercent: Math.round((responses.length / required) * 100),
        avgScore: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0,
        passingScore: responses.length > 0 ? responses[0].scoreTotal : 50,
        passedCount,
        failedCount: scoredCount - passedCount,
        departmentBreakdown: deptCount,
        departmentCount: Object.keys(deptCount).length,
        scoreDistribution: (() => {
          const dist = [0,0,0,0,0];
          for (const r of responses) { if (r.scoreTotal > 0) { const p = (r.scoreNum/r.scoreTotal)*100; dist[Math.min(Math.floor(p/20),4)]++; } }
          return dist;
        })(),
        timeDistribution: (() => {
          const slots = {};
          for (const r of responses) { if (r.time) { try { const h = new Date(r.time).getUTCHours() - 8; const slot = ((h < 0 ? h + 24 : h) + ":00"); slots[slot] = (slots[slot] || 0) + 1; } catch(e){} } }
          return slots;
        })()
      };
    });

    res.json({ quizzes: result, file, config });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get single quiz detail
app.get("/api/quizzes/:title", async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const config = loadConfig();
    const { quizzes } = await parseXlsxData();
    const formMap = JSON.parse(fs.readFileSync(FORM_IDS_PATH, "utf8"));
    const formId = formMap[title];
    if (!formId) return res.status(404).json({ error: "Quiz not found" });

    const quizData = quizzes[title] || { responses: [] };
    // Deduplicate: keep latest per employee
    const seen2 = new Map();
    for (const r of quizData.responses) {
      const key = r.empId || r.name;
      if (!seen2.has(key)) seen2.set(key, r);
      else if (r.time > seen2.get(key).time) seen2.set(key, r);
    }
    const responses = [...seen2.values()];
    const required = config.requiredByQuiz[title] || 8;
    const deptCount = {};
    let totalScore = 0, scoredCount = 0, passedCount = 0;
    const passingThreshold = (config.passingScorePercent || 60) / 100;

    for (const r of responses) {
      deptCount[r.dept] = (deptCount[r.dept] || 0) + 1;
      if (r.scoreTotal > 0) {
        totalScore += r.scoreNum;
        scoredCount++;
        if (r.scoreNum / r.scoreTotal >= passingThreshold) passedCount++;
      }
    }

    res.json({
      title,
      formId,
      responses,
      submitted: responses.length,
      required,
      completionPercent: Math.round((responses.length / required) * 100),
      avgScore: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0,
      passingScore: responses.length > 0 ? responses[0].scoreTotal : 50,
      passedCount,
      failedCount: scoredCount - passedCount,
      departmentBreakdown: deptCount
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get all employees overview
app.get("/api/employees", async (req, res) => {
  try {
    const config = loadConfig();
    const { quizzes, file } = await parseXlsxData();
    const formMap = JSON.parse(fs.readFileSync(FORM_IDS_PATH, "utf8"));
    const passingThreshold = (config.passingScorePercent || 60) / 100;

    const employeeMap = {};

    for (const [quizTitle, formId] of Object.entries(formMap)) {
      const quizData = quizzes[quizTitle] || { responses: [] };
      // Deduplicate per quiz: keep latest per employee
      const seenQ = new Map();
      for (const r of quizData.responses) {
        const k = r.empId || r.name;
        if (!seenQ.has(k)) seenQ.set(k, r);
        else if (r.time > seenQ.get(k).time) seenQ.set(k, r);
      }
      const deduped = [...seenQ.values()];
      const required = config.requiredByQuiz[quizTitle] || 8;

      for (const r of deduped) {
        const key = r.empId || r.name;
        if (!key) continue;
        if (!employeeMap[key]) {
          employeeMap[key] = { name: r.name, dept: r.dept, empId: r.empId, quizzes: [] };
        }
        const passed = r.scoreTotal > 0 && (r.scoreNum / r.scoreTotal >= passingThreshold);
        employeeMap[key].quizzes.push({
          title: quizTitle,
          scoreNum: r.scoreNum,
          scoreTotal: r.scoreTotal,
          passed,
          time: r.time
        });
      }
    }

    const employees = Object.values(employeeMap).map(e => {
      const completed = e.quizzes.length;
      const totalQuizzes = Object.keys(formMap).length;
      const passedQuizzes = e.quizzes.filter(q => q.passed).length;
      const avgScore = e.quizzes.length > 0
        ? Math.round(e.quizzes.reduce((s, q) => s + (q.scoreTotal > 0 ? (q.scoreNum / q.scoreTotal) * 100 : 0), 0) / e.quizzes.length)
        : 0;
      return {
        ...e,
        completed,
        totalQuizzes,
        completionPercent: Math.round((completed / totalQuizzes) * 100),
        passedQuizzes,
        failedQuizzes: completed - passedQuizzes,
        avgScore
      };
    });

    employees.sort((a, b) => b.completed - a.completed || b.avgScore - a.avgScore);

    res.json({ employees, totalQuizzes: Object.keys(formMap).length, file });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get heatmap data (employee x quiz matrix)
app.get("/api/heatmap", async (req, res) => {
  try {
    const config = loadConfig();
    const { quizzes } = await parseXlsxData();
    const formMap = JSON.parse(fs.readFileSync(FORM_IDS_PATH, "utf8"));
    const passingThreshold = (config.passingScorePercent || 60) / 100;
    const quizTitles = Object.keys(formMap);

    const employeeMap = {};
    for (const [quizTitle] of Object.entries(formMap)) {
      const quizData = quizzes[quizTitle] || { responses: [] };
      // Deduplicate per quiz
      const seenH = new Map();
      for (const r of quizData.responses) {
        const k = r.empId || r.name;
        if (!seenH.has(k)) seenH.set(k, r);
        else if (r.time > seenH.get(k).time) seenH.set(k, r);
      }
      for (const r of seenH.values()) {
        const key = r.empId || r.name;
        if (!key) continue;
        if (!employeeMap[key]) employeeMap[key] = { name: r.name, dept: r.dept, empId: r.empId, scores: {} };
        const pct = r.scoreTotal > 0 ? Math.round((r.scoreNum / r.scoreTotal) * 100) : 0;
        const passed = r.scoreTotal > 0 && (r.scoreNum / r.scoreTotal >= passingThreshold);
        employeeMap[key].scores[quizTitle] = { pct, passed, scoreNum: r.scoreNum, scoreTotal: r.scoreTotal };
      }
    }

    const employees = Object.values(employeeMap);
    res.json({ employees, quizTitles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get question analysis per quiz
app.get("/api/questions/:title", async (req, res) => {
  try {
    const title = decodeURIComponent(req.params.title);
    const { quizzes } = await parseXlsxData();
    const formMap = JSON.parse(fs.readFileSync(FORM_IDS_PATH, "utf8"));
    const formId = formMap[title];
    if (!formId) return res.status(404).json({ error: "Quiz not found" });

    const quizData = quizzes[title] || { responses: [] };
    // Deduplicate
    const seen = new Map();
    for (const r of quizData.responses) {
      const k = r.empId || r.name;
      if (!seen.has(k)) seen.set(k, r);
      else if (r.time > seen.get(k).time) seen.set(k, r);
    }
    const deduped = [...seen.values()];

    if (quizData.headers) {
      const questionHeaders = quizData.headers.filter(h =>
        h && !["提交時間","姓名","部門","工號","分數"].includes(h)
      );
      const questionStats = questionHeaders.map(q => {
        const answerCounts = {};
        let total = 0;
        for (const r of deduped) {
          const ans = r.answers[q];
          if (ans) {
            answerCounts[ans] = (answerCounts[ans] || 0) + 1;
            total++;
          }
        }
        const topCount = Math.max(0, ...Object.values(answerCounts));
        const options = Object.entries(answerCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
        return { question: q, answerCounts, options, total, correctCount: topCount, incorrectCount: total - topCount };
      });
      res.json({ title, questions: questionStats });
    } else {
      res.json({ title, questions: [] });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get single employee detail
app.get("/api/employee/:empId", async (req, res) => {
  try {
    const empId = decodeURIComponent(req.params.empId);
    const config = loadConfig();
    const { quizzes } = await parseXlsxData();
    const formMap = JSON.parse(fs.readFileSync(FORM_IDS_PATH, "utf8"));
    const passingThreshold = (config.passingScorePercent || 60) / 100;

    const results = [];
    let firstName = "", firstDept = "", firstEmpId = "";
    for (const [quizTitle, formId] of Object.entries(formMap)) {
      const quizData = quizzes[quizTitle] || { responses: [] };
      // Deduplicate: keep latest per employee (same as heatmap)
      const seen = new Map();
      for (const r of quizData.responses) {
        const k = r.empId || r.name;
        if (!seen.has(k)) seen.set(k, r);
        else if (r.time > seen.get(k).time) seen.set(k, r);
      }
      const response = seen.get(empId);
      if (response) {
        if (!firstName) { firstName = response.name; firstDept = response.dept; firstEmpId = response.empId; }
        const passed = response.scoreTotal > 0 && (response.scoreNum / response.scoreTotal >= passingThreshold);
        results.push({
          title: quizTitle,
          scoreNum: response.scoreNum,
          scoreTotal: response.scoreTotal,
          pct: response.scoreTotal > 0 ? Math.round((response.scoreNum / response.scoreTotal) * 100) : 0,
          passed,
          time: response.time,
          answers: response.answers,
          name: response.name,
          dept: response.dept,
          empId: response.empId
        });
      }
    }

    // Return 404 if employee has no submissions at all
    if (results.length === 0) {
      return res.status(404).json({ error: "Employee not found", empId });
    }

    const passedCount = results.filter(r => r.passed).length;
    const avgPct = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.pct, 0) / results.length) : 0;

    res.json({ empId: firstEmpId || empId, name: firstName || empId, dept: firstDept || "", results, passedCount, failedCount: results.length - passedCount, avgPct, total: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Get config
app.get("/api/config", (req, res) => {
  res.json(loadConfig());
});

// API: Update config
app.post("/api/config", (req, res) => {
  saveConfig(req.body);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
