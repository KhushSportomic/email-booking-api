// helpers/gmail.ts
import SyncState from "../models/SyncState";
import { saveTokens } from "../util/refreshToken";
import { Request, Response, NextFunction } from "express";

// Immediately load tokens from DB on startup
(async () => {
  const state = await SyncState.findById("gmail-sync-state");
  // Ensure tokens are not undefined before spreading
  if (
    state?.tokens?.access_token &&
    state.tokens.refresh_token &&
    state.tokens.expiryDate
  ) {
    await saveTokens(state.tokens as any);
    console.log("🔄 Loaded state from MongoDB:", state);
  } else {
    console.log("ℹ️ No previous sync state found, starting fresh.");
  }
})();

export async function restartWatch(gmail: any) {
  console.log("🔄 Restarting Gmail watch...");
  const watchResponse = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: "projects/email-listener-470308/topics/new-email-topic",
      labelIds: ["INBOX"],
    },
  });

  console.log(
    "📡 Gmail watch restarted. New historyId:",
    watchResponse.data.historyId
  );

  await SyncState.findByIdAndUpdate(
    "gmail-sync-state",
    { lastHistoryId: watchResponse.data.historyId },
    { upsert: true, new: true }
  );
}

// Middleware to attach restartWatch to request
export function restartWatchMiddleware(
  req: Request & { restartWatch?: typeof restartWatch },
  res: Response,
  next: NextFunction
) {
  req.restartWatch = restartWatch;
  next();
}
