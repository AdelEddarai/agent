import { createLogger } from '@sim/logger'
import { generateShortId } from '@sim/utils/id'
import {
  executeInIsolatedVM,
  type IsolatedVMBrokerHandler,
  type IsolatedVMExecutionRequest,
} from '@/lib/execution/isolated-vm'
import type { SandboxBrokerContext, SandboxTaskInput } from '@/lib/execution/sandbox/types'
import { getSandboxTask, type SandboxTaskId } from '@/sandbox-tasks/registry'

const logger = createLogger('SandboxRunTask')

export interface RunSandboxTaskOptions {
  /**
   * Owner key used by the isolated-vm pool for fairness + distributed leases.
   * Typically `user:<userId>` or `workspace:<workspaceId>`.
   */
  ownerKey?: string
  /** Optional AbortSignal to cancel the execution early. */
  signal?: AbortSignal
}

/**
 * Thrown when the sandbox failure is attributable to the caller — user code
 * errors (SyntaxError, ReferenceError, user-thrown exceptions), timeouts from
 * user code, client aborts, or per-owner rate limits. Callers should translate
 * this into a 4xx response so genuine 5xx remains a signal of server health.
 *
 * System-origin failures (worker crash, IPC failure, pool saturation, task
 * misconfig) are tagged with `isSystemError` at the isolated-vm layer and
 * surface as a plain `Error` → 500.
 */
export class SandboxUserCodeError extends Error {
  constructor(message: string, name: string, stack?: string) {
    super(message)
    this.name = name || 'SandboxUserCodeError'
    if (stack) this.stack = stack
  }
}

/**
 * Executes a sandbox task inside the shared isolated-vm pool and returns the
 * binary result buffer. Throws with a human-readable message if the task fails
 * so callers can propagate the error verbatim to UI.
 */
export async function runSandboxTask<TInput extends SandboxTaskInput>(
  taskId: SandboxTaskId,
  input: TInput,
  options: RunSandboxTaskOptions = {}
): Promise<Buffer> {
  const task = getSandboxTask(taskId)
  const requestId = generateShortId(12)

  const brokerContext: SandboxBrokerContext = {
    workspaceId: input.workspaceId,
    requestId,
  }
  const brokers: Record<string, IsolatedVMBrokerHandler> = {}
  for (const broker of task.brokers) {
    brokers[broker.name] = (args) => broker.handle(brokerContext, args)
  }

  const request: IsolatedVMExecutionRequest = {
    code: input.code,
    params: {},
    envVars: {},
    contextVariables: {},
    timeoutMs: task.timeoutMs,
    requestId,
    ownerKey: options.ownerKey,
    ownerWeight: 1,
    task: {
      id: task.id,
      bundles: [...task.bundles],
      bootstrap: task.bootstrap,
      brokers: task.brokers.map((b) => b.name),
      finalize: task.finalize,
    },
  }

  const start = Date.now()
  
  /* --- BEGIN ISOLATED-VM DISABLE --- 
  const result = await executeInIsolatedVM(request, { brokers, signal: options.signal })
  const elapsedMs = Date.now() - start
  const queueMs = result.timings ? Math.max(0, elapsedMs - result.timings.total) : undefined
  if (result.error) {
    throw new SandboxUserCodeError(result.error.message, result.error.name || 'SandboxTaskError', result.error.stack)
  }
  const bytes = Buffer.from(result.bytesBase64, 'base64')
  return task.toResult(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), input)
  --- END ISOLATED-VM DISABLE --- */

  // E2B CLOUD IMPLEMENTATION
  logger.info('Routing sandbox execution to E2B Cloud', { taskId, requestId })
  
  if (!process.env.E2B_API_KEY) {
    throw new SandboxUserCodeError('E2B_API_KEY is not configured', 'ConfigurationError')
  }

  // TODO: Full E2B integration using @e2b/code-interpreter 
  // const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY })
  // const execResult = await sandbox.runCode(input.code)
  
  throw new Error("E2B Cloud Execution is enabled but pending full API integration for this specific task type.")
}
