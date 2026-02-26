import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express"

const TRANSIENT_DB_ERROR_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
])

const HTTP_ERROR = {
  serviceUnavailable: "service_unavailable",
  internalError: "internal_error",
} as const

const HTTP_ERROR_MESSAGE = {
  databaseInterrupted: {
    en: "Database connection was interrupted. Please retry.",
    zh: "数据库连接已中断，请重试。",
  },
} as const

type HttpLocale = "en" | "zh"
type HttpMessageKey = keyof typeof HTTP_ERROR_MESSAGE

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function resolveHttpLocale(req: Request): HttpLocale {
  const acceptLanguage = req.headers["accept-language"]
  if (typeof acceptLanguage === "string" && acceptLanguage.trim().toLowerCase().startsWith("zh")) {
    return "zh"
  }
  const envLocale = (process.env.OPENWORK_LANG ?? "").trim().toLowerCase()
  if (envLocale.startsWith("zh")) return "zh"
  return "en"
}

function httpMessage(req: Request, key: HttpMessageKey): string {
  return HTTP_ERROR_MESSAGE[key][resolveHttpLocale(req)]
}

function getErrorCode(error: unknown): string | null {
  if (!isRecord(error)) {
    return null
  }

  if (typeof error.code === "string") {
    return error.code
  }

  return getErrorCode(error.cause)
}

export function isTransientDbConnectionError(error: unknown): boolean {
  const code = getErrorCode(error)
  if (!code) {
    return false
  }
  return TRANSIENT_DB_ERROR_CODES.has(code)
}

export function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  if (res.headersSent) {
    return
  }

  if (isTransientDbConnectionError(error)) {
    const message = error instanceof Error ? error.message : "transient database connection failure"
    console.warn(`[http] transient db connection error: ${message}`)
    res.status(503).json({
      error: HTTP_ERROR.serviceUnavailable,
      message: httpMessage(req, "databaseInterrupted"),
    })
    return
  }

  const message = error instanceof Error ? error.stack ?? error.message : String(error)
  console.error(`[http] unhandled error: ${message}`)
  res.status(500).json({ error: HTTP_ERROR.internalError })
}
