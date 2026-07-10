import fs from 'fs'
import path from 'path'

export interface TestSuiteResult {
  name: string
  status: 'passed' | 'failed'
  duration: number
  assertionResults: Array<{
    title: string
    status: 'passed' | 'failed'
    err?: string
  }>
}

export function compileReport(vitestJsonPath: string, outputDir: string, checklistPath: string) {
  const reportsDir = outputDir
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  let testSuites: TestSuiteResult[] = []
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0
  let overallStatus: 'PASS' | 'WARNING' | 'BLOCK RELEASE' = 'PASS'
  let readinessScore = 100

  // 1. Read Vitest Results
  if (fs.existsSync(vitestJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(vitestJsonPath, 'utf8'))
      const results = data.testResults || []

      for (const suite of results) {
        const suiteName = path.basename(suite.name)
        const suiteStatus = suite.status === 'passed' ? 'passed' : 'failed'
        const duration = (suite.endTime - suite.startTime) || 0

        const assertions = (suite.assertionResults || []).map((ast: any) => {
          totalTests++
          if (ast.status === 'passed') {
            passedTests++
          } else {
            failedTests++
            overallStatus = 'BLOCK RELEASE'
            readinessScore -= 10
          }
          return {
            title: ast.title,
            status: ast.status === 'passed' ? 'passed' : 'failed',
            err: ast.failureMessages?.join('\n') || undefined,
          }
        })

        testSuites.push({
          name: suiteName,
          status: suiteStatus,
          duration,
          assertionResults: assertions,
        })
      }
    } catch (err) {
      overallStatus = 'BLOCK RELEASE'
      readinessScore = 0
    }
  } else {
    overallStatus = 'BLOCK RELEASE'
    readinessScore = 0
  }

  // 2. Read Checklist Gatekeeper Rules
  let checklistData = {}
  if (fs.existsSync(checklistPath)) {
    try {
      checklistData = JSON.parse(fs.readFileSync(checklistPath, 'utf8'))
    } catch {}
  }

  // Ensure score is not negative
  readinessScore = Math.max(0, readinessScore)
  if (readinessScore < 90 && overallStatus === 'PASS') {
    overallStatus = 'WARNING'
  }

  // 3. Compile JSON Report
  const finalJson = {
    generatedAt: new Date().toISOString(),
    overallStatus,
    readinessScore,
    totalTests,
    passedTests,
    failedTests,
    checklist: checklistData,
    suites: testSuites,
  }

  fs.writeFileSync(
    path.join(reportsDir, 'production-report.json'),
    JSON.stringify(finalJson, null, 2),
    'utf8'
  )

  // 4. Compile Premium HTML Dashboard Report
  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShopDZ — Release Validation Staging Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090e;
      --panel: rgba(18, 18, 28, 0.6);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary-pass: #10b981;
      --primary-warn: #f59e0b;
      --primary-fail: #ef4444;
      --gradient-pass: linear-gradient(135deg, #059669 0%, #10b981 100%);
      --gradient-warn: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
      --gradient-fail: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
      background-image: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 40%),
                        radial-gradient(circle at 90% 80%, rgba(244, 63, 94, 0.1) 0%, transparent 40%);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .logo-area h1 {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.05em;
      background: linear-gradient(to right, #6366f1, #a855f7, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .logo-area p {
      color: var(--text-muted);
      margin-top: 0.2rem;
      font-size: 0.95rem;
    }

    .gate-badge {
      padding: 0.6rem 1.5rem;
      border-radius: 50px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 0.9rem;
      letter-spacing: 0.05em;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .gate-PASS {
      background: var(--gradient-pass);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .gate-WARNING {
      background: var(--gradient-warn);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .gate-BLOCK {
      background: var(--gradient-fail);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .card {
      background: var(--panel);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
      position: relative;
      overflow: hidden;
    }

    .card-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .card-value {
      font-size: 2.2rem;
      font-weight: 800;
    }

    .score-accent {
      background: linear-gradient(to right, #34d399, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .section-title {
      font-size: 1.4rem;
      font-weight: 800;
      margin-bottom: 1.5rem;
      letter-spacing: -0.02em;
    }

    .suites-area {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 3rem;
    }

    .suite-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.2rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .suite-row:hover {
      background: rgba(255, 255, 255, 0.04);
      transform: translateY(-2px);
    }

    .suite-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .suite-status {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .status-passed { background-color: var(--primary-pass); box-shadow: 0 0 10px var(--primary-pass); }
    .status-failed { background-color: var(--primary-fail); box-shadow: 0 0 10px var(--primary-fail); }

    .suite-name {
      font-weight: 600;
      font-size: 1.1rem;
    }

    .suite-metrics {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .k6-section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 3rem;
    }

    .k6-desc {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
    }

    .k6-matrix-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .k6-scenario-card {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
      background: rgba(0,0,0,0.2);
    }

    .k6-title {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }

    .k6-cmd {
      font-family: monospace;
      font-size: 0.8rem;
      background: #111;
      padding: 0.4rem;
      border-radius: 4px;
      color: #a78bfa;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <h1>ShopDZ RVF</h1>
        <p>Release Validation Framework • Rapport d'éligibilité production</p>
      </div>
      <div class="gate-badge gate-${overallStatus.includes('BLOCK') ? 'BLOCK' : overallStatus}">
        ${overallStatus}
      </div>
    </header>

    <div class="metrics-grid">
      <div class="card">
        <div class="card-label">Readiness Score</div>
        <div class="card-value score-accent">${readinessScore}%</div>
      </div>
      <div class="card">
        <div class="card-label">Test Validations</div>
        <div class="card-value" style="color: var(--primary-pass)">${passedTests} / ${totalTests}</div>
      </div>
      <div class="card">
        <div class="card-label">Généré le</div>
        <div class="card-value" style="font-size: 1.2rem; margin-top: 0.7rem; font-weight: 600;">
          ${new Date().toLocaleString('fr-FR')}
        </div>
      </div>
    </div>

    <div class="section-title">Validations des Suites Applicatives</div>
    <div class="suites-area">
      ${testSuites.map(suite => `
        <div class="suite-row">
          <div class="suite-info">
            <div class="suite-status status-${suite.status}"></div>
            <div class="suite-name">${suite.name}</div>
          </div>
          <div class="suite-metrics">
            <div>Durée: <b>${suite.duration}ms</b></div>
            <div>Assertions: <b>${suite.assertionResults.length}</b></div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="k6-section">
      <div class="section-title">Profils k6 Load Testing Disponibles</div>
      <div class="k6-desc">
        Ces scripts de charge peuvent être lancés en staging pour mesurer les performances sous stress :
      </div>
      <div class="k6-matrix-grid">
        <div class="k6-scenario-card">
          <div class="k6-title">🛒 Scenario Checkout</div>
          <div class="k6-cmd">k6 run scripts/staging-validation/k6/checkout.js</div>
        </div>
        <div class="k6-scenario-card">
          <div class="k6-title">📖 Scenario Browse</div>
          <div class="k6-cmd">k6 run scripts/staging-validation/k6/browse.js</div>
        </div>
        <div class="k6-scenario-card">
          <div class="k6-title">⚡ Scenario Spike (Traffic surge)</div>
          <div class="k6-cmd">k6 run scripts/staging-validation/k6/spike.js</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  fs.writeFileSync(
    path.join(reportsDir, 'production-report.html'),
    htmlContent,
    'utf8'
  )
}
