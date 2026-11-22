/**
 * src/middleware/validate.js
 * Zod validation helper middleware.
 * Ensures all validation errors return consistent JSON: { error: "message" }
 */

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors[0]?.message || 'Validation error';
    return res.status(400).json({ error: message });
  }
  req.body = result.data;
  next();
};

module.exports = validate;
