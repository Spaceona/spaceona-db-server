import { Context, Next } from "hono";

// Define your authentication middleware
export const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.query("token");
  console.log("Hit middleware!");
  if (!process.env.AUTH_TOKEN || token !== process.env.AUTH_TOKEN) {
    return c.text("Unauthorized", 401);
  }
  await next();
};

/*
EXAMPLE:
    /metrics?token=abc123
*/
