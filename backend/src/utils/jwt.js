import jwt from "jsonwebtoken";

/**
 * Signs a JWT for a given user. `sub` (subject) carries the user id since
 * that's the JWT-standard claim name for "who this token is about" — the
 * auth middleware reads it back out as req.user.id.
 */
export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}
