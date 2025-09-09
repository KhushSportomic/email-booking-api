// routes/home.ts
import express, { Request, Response } from "express";

const router = express.Router();

// Extend Request type to include user
interface HomeRequest extends Request {
  user?: any;
}

router.get("/", (req: HomeRequest, res: Response<any, Record<string, any>>) => {
  if (!req.user) return res.send("Not logged in");
  res.send(`Hello ${req.user.displayName} (${req.user.emails[0].value})`);
});

router.get("/login", (req: Request, res: Response) => {
  res.send('<a href="/auth/google">Login with Google</a>');
});

export default router;
