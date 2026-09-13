export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const error = new Error(
      result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
    error.status = 422;
    error.code = "VALIDATION_ERROR";
    return next(error);
  }
  req.body = result.data;
  next();
};
