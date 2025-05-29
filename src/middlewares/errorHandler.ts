import { Response } from "express";

export const errorHandler = (err: any, res: Response) => {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    console.error("Global Error Handler:", err);
  }

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    error: "Internal Server Error",
    message: err.message || "Something went wrong",
    ...(isDev && { stack: err.stack }), // includes stack only in dev
  });
};
