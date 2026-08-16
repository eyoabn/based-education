import http from 'http'
import https from 'https'
import * as jose from 'jose'

const JWT_SECRET = new TextEncoder().encode('dev-only-secret-change-before-production')

async function createAuthCookie() {
  return await new jose.SignJWT({ userId: 'stress-user-1', name: 'Stress Tester', role: 'TEACHER' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

const TARGET_URL = process.env.STRESS_TARGET || 'http://localhost:3000/api/posts'
const CONCURRENCY_LEVELS = [10, 50, 100, 250]
const REQUESTS_PER_CLIENT = 10

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 500 })
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 500 })

console.log(`\n==================================================`)
console.log(`🚀 EDUCONNECT PERFORMANCE & STRESS TEST SUITE`)
console.log(`==================================================`)
console.log(`Target Endpoint: ${TARGET_URL}`)

async function runBatch(concurrency, authToken) {
  const totalRequests = concurrency * REQUESTS_PER_CLIENT
  console.log(`\n[Test Run] Simulating ${concurrency} Concurrent Users (${totalRequests} Total Requests)...`)

  const latencies = []
  let successCount = 0
  let errorCount = 0
  const startTime = Date.now()

  const makeRequest = () => {
    return new Promise((resolve) => {
      const reqStart = Date.now()
      const isHttps = TARGET_URL.startsWith('https')
      const client = isHttps ? https : http
      const agent = isHttps ? httpsAgent : httpAgent

      const options = {
        agent,
        headers: {
          cookie: `token=${authToken}`
        }
      }

      const req = client.get(TARGET_URL, options, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          const latency = Date.now() - reqStart
          latencies.push(latency)
          if (res.statusCode >= 200 && res.statusCode < 400) {
            successCount++
          } else {
            errorCount++
          }
          resolve()
        })
      })

      req.on('error', () => {
        latencies.push(Date.now() - reqStart)
        errorCount++
        resolve()
      })

      req.end()
    })
  }

  const userWorkers = Array.from({ length: concurrency }).map(async () => {
    for (let i = 0; i < REQUESTS_PER_CLIENT; i++) {
      await makeRequest()
    }
  })

  await Promise.all(userWorkers)

  const totalTime = (Date.now() - startTime) / 1000
  latencies.sort((a, b) => a - b)

  const avgLatency = (latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1)).toFixed(2)
  const minLatency = latencies[0] || 0
  const maxLatency = latencies[latencies.length - 1] || 0
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0
  const rps = (totalRequests / (totalTime || 0.001)).toFixed(2)
  const successRate = ((successCount / totalRequests) * 100).toFixed(1)

  console.log(`--------------------------------------------------`)
  console.log(`📊 RESULTS (${concurrency} Concurrent Users):`)
  console.log(`   - Total Duration:       ${totalTime.toFixed(2)}s`)
  console.log(`   - Requests / Sec (RPS):  ${rps} req/sec`)
  console.log(`   - Success Rate:         ${successRate}% (${successCount}/${totalRequests})`)
  console.log(`   - Average Latency:      ${avgLatency} ms`)
  console.log(`   - 95th Percentile (P95): ${p95} ms`)
  console.log(`   - 99th Percentile (P99): ${p99} ms`)
  console.log(`   - Max Response Time:    ${maxLatency} ms`)

  return { concurrency, rps, avgLatency, p95, p99, successRate }
}

async function runAll() {
  const authToken = await createAuthCookie()
  for (const c of CONCURRENCY_LEVELS) {
    await runBatch(c, authToken)
  }

  console.log(`\n==================================================`)
  console.log(`🔥 LIVEKIT & WEBSOCKET CAPACITY CALCULATION REPORT`)
  console.log(`==================================================`)
  console.log(`- Typical Audio Track Bitrate: 32 kbps`)
  console.log(`- Low-bandwidth Video (Adaptive): 150 kbps`)
  console.log(`- Standard HD Video Track: 800 kbps`)
  console.log(`- Estimated max participants on 1Gbps SFU node: ~1,200 active connections`)
  console.log(`- Recommended Max Live Class Size (with Dynacast/Adaptive): 250 - 500 interactive students per room`)
  console.log(`==================================================\n`)
}

runAll().catch(err => {
  console.error("Stress Test Error:", err)
})
