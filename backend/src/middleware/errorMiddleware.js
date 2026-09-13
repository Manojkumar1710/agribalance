export function notFound(req, res) {
  res
    .status(404)
    .json({ success: false, message: "Route not found", error: "NOT_FOUND" });
}

export function errorHandler(error, req, res, _next) {
  const status = error.status || (error.name === "ValidationError" ? 422 : 500);
  const message =
    status >= 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message;
  res
    .status(status)
    .json({ success: false, message, error: error.code || "REQUEST_ERROR" });
}
