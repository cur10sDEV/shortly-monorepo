/* eslint-disable no-console */
import { getTicket } from "../src/api/v1/tickets/data-access/ticket.js"

// Track results for analysis
interface TestResult {
  success: boolean
  ticket: bigint | null
  rangeId: number | null
  duration: number
  error?: string
}

// Basic concurrent load test
async function basicLoadTest(concurrentRequests: number, iterations: number) {
  console.log(`\n=== Basic Load Test ===`)
  console.log(`Concurrent requests: ${concurrentRequests}`)
  console.log(`Iterations: ${iterations}`)

  const results: TestResult[] = []
  const startTime = Date.now()

  for (let i = 0; i < iterations; i++) {
    const batch = Array(concurrentRequests)
      .fill(null)
      .map(async () => {
        const reqStart = Date.now()
        try {
          const result = await getTicket()
          return {
            success: true,
            ticket: result.ticket,
            rangeId: result.rangeId,
            duration: Date.now() - reqStart,
          }
        } catch (error) {
          return {
            success: false,
            ticket: null,
            rangeId: null,
            duration: Date.now() - reqStart,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      })

    const batchResults = await Promise.all(batch)
    results.push(...batchResults)

    // Optional: small delay between batches
    // await new Promise(resolve => setTimeout(resolve, 10))
  }

  const totalTime = Date.now() - startTime
  analyzeResults(results, totalTime)

  return results
}

// Stress test - continuously hammer the function
async function stressTest(durationMs: number, maxConcurrent: number) {
  console.log(`\n=== Stress Test ===`)
  console.log(`Duration: ${durationMs}ms`)
  console.log(`Max concurrent: ${maxConcurrent}`)

  const results: TestResult[] = []
  const startTime = Date.now()
  let activeRequests = 0

  const makeRequest = async () => {
    const reqStart = Date.now()
    activeRequests++
    try {
      const result = await getTicket()
      results.push({
        success: true,
        ticket: result.ticket,
        rangeId: result.rangeId,
        duration: Date.now() - reqStart,
      })
    } catch (error) {
      results.push({
        success: false,
        ticket: null,
        rangeId: null,
        duration: Date.now() - reqStart,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      activeRequests--
    }
  }

  // Keep firing requests until time is up
  while (Date.now() - startTime < durationMs) {
    if (activeRequests < maxConcurrent) {
      makeRequest() // Fire and forget
    }
    await new Promise((resolve) => setTimeout(resolve, 1)) // Small delay
  }

  // Wait for all pending requests to complete
  while (activeRequests > 0) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  const totalTime = Date.now() - startTime
  analyzeResults(results, totalTime)

  return results
}

// Check for duplicate tickets (critical bug)
function checkForDuplicates(results: TestResult[]) {
  console.log(`\n=== Duplicate Check ===`)

  const tickets = results
    .filter((r) => r.success && r.ticket !== null)
    .map((r) => r.ticket!.toString())

  const uniqueTickets = new Set(tickets)
  const duplicateCount = tickets.length - uniqueTickets.size

  if (duplicateCount > 0) {
    console.error(`❌ CRITICAL: Found ${duplicateCount} duplicate tickets!`)

    // Find which tickets were duplicated
    const ticketCounts = new Map<string, number>()
    tickets.forEach((ticket) => {
      ticketCounts.set(ticket, (ticketCounts.get(ticket) || 0) + 1)
    })

    console.log(`Duplicated tickets:`)
    ticketCounts.forEach((count, ticket) => {
      if (count > 1) {
        console.log(`  Ticket ${ticket}: issued ${count} times`)
      }
    })
  } else {
    console.log(`✅ No duplicate tickets found`)
  }

  return duplicateCount
}

// Analyze results
function analyzeResults(results: TestResult[], totalTime: number) {
  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)
  const nullTickets = successful.filter((r) => r.ticket === null)

  console.log(`\n=== Results ===`)
  console.log(`Total requests: ${results.length}`)
  console.log(
    `Successful: ${successful.length} (${(
      (successful.length / results.length) *
      100
    ).toFixed(2)}%)`
  )
  console.log(`Failed: ${failed.length}`)
  console.log(`Null tickets: ${nullTickets.length}`)
  console.log(`Total time: ${totalTime}ms`)
  console.log(
    `Requests/second: ${(results.length / (totalTime / 1000)).toFixed(2)}`
  )

  if (successful.length > 0) {
    const durations = successful.map((r) => r.duration)
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    const minDuration = Math.min(...durations)
    const maxDuration = Math.max(...durations)
    const p95Duration = durations.sort((a, b) => a - b)[
      Math.floor(durations.length * 0.95)
    ]

    console.log(`\n=== Performance ===`)
    console.log(`Avg response time: ${avgDuration.toFixed(2)}ms`)
    console.log(`Min response time: ${minDuration}ms`)
    console.log(`Max response time: ${maxDuration}ms`)
    console.log(`P95 response time: ${p95Duration}ms`)
  }

  if (failed.length > 0) {
    console.log(`\n=== Errors ===`)
    const errorGroups = new Map<string, number>()
    failed.forEach((r) => {
      const error = r.error || "Unknown error"
      errorGroups.set(error, (errorGroups.get(error) || 0) + 1)
    })
    errorGroups.forEach((count, error) => {
      console.log(`${error}: ${count}`)
    })
  }

  // Check ticket distribution across ranges
  const rangeDistribution = new Map<number, number>()
  successful.forEach((r) => {
    if (r.rangeId !== null) {
      rangeDistribution.set(
        r.rangeId,
        (rangeDistribution.get(r.rangeId) || 0) + 1
      )
    }
  })

  if (rangeDistribution.size > 0) {
    console.log(`\n=== Range Distribution ===`)
    rangeDistribution.forEach((count, rangeId) => {
      console.log(`Range ${rangeId}: ${count} tickets`)
    })
  }
}

// Run all tests
async function runAllTests() {
  console.log("Starting load tests...\n")

  // Test 1: Moderate concurrent load
  const test1Results = await basicLoadTest(50, 10) // 500 total requests
  checkForDuplicates(test1Results)

  // Test 2: High concurrent load
  const test2Results = await basicLoadTest(200, 5) // 1000 total requests
  checkForDuplicates(test2Results)

  // Test 3: Stress test
  const test3Results = await stressTest(5000, 100) // 5 seconds, max 100 concurrent
  checkForDuplicates(test3Results)

  console.log("\n=== All tests completed ===")
}

// Run the tests
runAllTests().catch(console.error)
