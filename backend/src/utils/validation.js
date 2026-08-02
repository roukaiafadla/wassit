/**
 * Throws a 400 error if `condition` is false. Caught by the central error
 * handler in app.js (via express-async-errors), so controllers can just
 * call this instead of manually checking + returning at every step.
 */
export function assertRequest(condition, message) {
  if (!condition) {
    const err = new Error(message);
    err.status = 400;
    throw err;
  }
}

export function notFound(message = "Not found") {
  const err = new Error(message);
  err.status = 404;
  throw err;
}

export function forbidden(message = "Forbidden") {
  const err = new Error(message);
  err.status = 403;
  throw err;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email);
}
