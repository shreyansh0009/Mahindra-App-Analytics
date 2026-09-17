/**
 * Attaches res.success() and res.paginated() helpers so controllers
 * always return a consistent response shape.
 */
const responseFormatter = (req, res, next) => {
  res.success = (data = null, statusCode = 200, meta = undefined) => {
    const body = { success: true, data };
    if (meta !== undefined) body.meta = meta;
    return res.status(statusCode).json(body);
  };

  res.paginated = (data, meta) => res.success(data, 200, meta);

  next();
};

module.exports = responseFormatter;
