export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(401, "unauthorized", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Sin permisos") {
    super(403, "forbidden", message);
  }
}

/**
 * Violación de constraint UNIQUE de Postgres (código 23505). Drizzle envuelve
 * el error real de `postgres` en un `DrizzleQueryError` — el código queda en
 * `err.cause.code`, no en `err.code` directo (confirmado con logs reales al
 * verificar T23/alta-rapida: chequear solo `err.code` nunca matcheaba).
 */
export function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}
