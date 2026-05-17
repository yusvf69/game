import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

let _logger: pino.Logger | null = null;

function getLoggerInternal(): pino.Logger {
  if (!_logger) {
    _logger = pino({
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
      ],
      ...(isProduction
        ? {}
        : {
            transport: {
              target: "pino-pretty",
              options: { colorize: true },
            },
          }),
    });
  }
  return _logger;
}

export const logger = new Proxy({} as pino.Logger, {
  get(_, prop) {
    return Reflect.get(getLoggerInternal(), prop, getLoggerInternal());
  },
});
