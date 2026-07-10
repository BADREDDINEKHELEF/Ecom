import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { compileReport } from './report'
import { runSmokeTest } from './smoke-test'
import { logger } from '../../src/lib/logger'

const WORKSPACE_DIR = path.resolve(__dirname, '../..')
const REPORTS_DIR = path.join(WORKSPACE_DIR, 'scripts/staging-validation/reports')
const VITEST_JSON_PATH = path.join(REPORTS_DIR, 'vitest-results.json')
const CHECKLIST_PATH = path.join(WORKSPACE_DIR, 'scripts/staging-validation/checklist.json')

async function main() {
  logger.info('========================================================')
  logger.info('🚀 ShopDZ — Running Release Validation Framework (RVF) 🚀')
  logger.info('========================================================')

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
  }

  // 1. Run Vitest on staging-validation test suites
  logger.info('[RVF] Step 1: Running staging-validation test suites...')
  let vitestSucceeded = false
  try {
    execSync(
      `npx vitest run scripts/staging-validation/ --reporter=json --outputFile="${VITEST_JSON_PATH}"`,
      { cwd: WORKSPACE_DIR, stdio: 'inherit', shell: true }
    )
    vitestSucceeded = true
  } catch (err: any) {
    logger.error('[RVF] Test execution failed.', { error: err.message, status: err.status, stderr: err.stderr?.toString() })
  }

  // 2. Run Smoke test if target URL is configured
  const targetUrl = process.env.DEPLOYMENT_URL
  let smokeSucceeded = true
  if (targetUrl) {
    logger.info(`[RVF] Step 2: Target DEPLOYMENT_URL detected: ${targetUrl}. Running smoke test...`)
    smokeSucceeded = await runSmokeTest(targetUrl)
  } else {
    logger.info('[RVF] Step 2: No DEPLOYMENT_URL environment variable set. Skipping smoke test.')
  }

  // 3. Compile report
  logger.info('[RVF] Step 3: Compiling JSON and HTML readiness reports...')
  compileReport(VITEST_JSON_PATH, REPORTS_DIR, CHECKLIST_PATH)

  // 4. Read report to resolve overall verdict
  let gateVerdict: 'PASS' | 'WARNING' | 'BLOCK RELEASE' = 'BLOCK RELEASE'
  let score = 0
  const reportJsonPath = path.join(REPORTS_DIR, 'production-report.json')
  if (fs.existsSync(reportJsonPath)) {
    try {
      const rep = JSON.parse(fs.readFileSync(reportJsonPath, 'utf-8'))
      gateVerdict = rep.overallStatus
      score = rep.readinessScore
    } catch {}
  }

  if (!vitestSucceeded || !smokeSucceeded) {
    gateVerdict = 'BLOCK RELEASE'
  }

  logger.info('========================================================')
  logger.info(`Verdict: ${gateVerdict}`)
  logger.info(`Readiness Score: ${score}%`)
  logger.info('========================================================')

  if (gateVerdict === 'BLOCK RELEASE') {
    logger.error('❌ Pipeline release BLOCKED due to validation failure(s).')
    process.exit(1)
  } else if (gateVerdict === 'WARNING') {
    logger.warn('⚠️ Staging validation passed with WARNINGS. Review report before merging.')
    process.exit(0)
  } else {
    logger.info('✅ Staging validation PASSED. Platform is launch-ready!')
    process.exit(0)
  }
}

main().catch((err) => {
  logger.error('[RVF] Orchestration failed:', err)
  process.exit(1)
})
