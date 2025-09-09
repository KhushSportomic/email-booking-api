// routes/auth.ts
import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import { google } from "googleapis";
import SyncState from "../models/SyncState";
import { saveTokens, oauth2Client } from "../util/refreshToken";
import { restartWatch } from "../helpers/gmail";

const router = express.Router();

// Extend Request type to include restartWatch
interface AuthRequest extends Request {
  user?: any;
  restartWatch?: typeof restartWatch;
}

router.get(
  "/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.labels",
    ],
    accessType: "offline",
    prompt: "consent",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const savedTokens = {
        access_token: req.user?.accessToken,
        refresh_token: req.user?.refreshToken,
      };

      await saveTokens({
        ...savedTokens,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // restart watch logic moved to helper
      if (req.restartWatch) {
        await req.restartWatch(gmail);
      }
    } catch (err) {
      console.error("❌ Error setting up Gmail watch:", err);
    }

    res.redirect("/");
  }
);

export default router;
