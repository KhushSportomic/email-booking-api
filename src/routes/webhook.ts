import express, { Request, Response } from "express";
import { google, gmail_v1 } from "googleapis";
import SyncState from "../models/SyncState";
import Email from "../models/Email";
import { saveTokens, oauth2Client } from "../util/refreshToken";
import parseBookingEmail, { ParseResult } from "../util/parseBookingEmail";
import Booking from "../models/Booking";
import { restartWatch } from "../helpers/gmail";

const router = express.Router();
const processedMessages = new Set<string>();

interface WebhookRequest extends Request {
  restartWatch?: typeof restartWatch;
}

interface Token {
  access_token?: string;
  refresh_token?: string;
}

router.post("/gmail", async (req: WebhookRequest, res: Response) => {
  res.status(200).send("OK");

  const { message } = req.body;
  if (!message?.data) {
    console.log("⚠️ No message data found.");
    return;
  }

  if (processedMessages.has(message.messageId)) {
    console.log("⏭️ Duplicate message skipped:", message.messageId);
    return;
  }
  processedMessages.add(message.messageId);

  const decoded = Buffer.from(message.data, "base64").toString("utf-8");
  console.log("🔔 Pub/Sub message:", decoded);

  let parsedPayload: any;
  try {
    parsedPayload = JSON.parse(decoded);
  } catch {
    console.log("⚠️ Not a JSON payload, skipping.");
    return;
  }

  const state = await SyncState.findById("gmail-sync-state");
  if (!state?.tokens) {
    console.error("❌ No tokens in DB! Please log in first.");
    return;
  }

  await saveTokens(state.tokens as any);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    const startHistoryId = state.lastHistoryId || parsedPayload.historyId!;
    console.log("🔎 Fetching history starting from:", startHistoryId);

    const history = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
    });

    if (!history.data.history) {
      console.log("⚠️ No history found.");
      if (req.restartWatch) await req.restartWatch(gmail);
      return;
    }

    for (const h of history.data.history as gmail_v1.Schema$History[]) {
      for (const msg of h.messages || []) {
        try {
          console.log("📌 Fetching message ID:", msg.id);
          const messageDetail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
          });

          const payload = messageDetail.data.payload!;
          const headers = payload.headers!;
          const subject = headers.find((h) => h.name === "Subject")?.value;
          const from = headers.find((h) => h.name === "From")?.value;

          function extractBody(parts: any[], preferred = "text/plain"): string {
            for (const part of parts) {
              if (part.mimeType === preferred && part.body?.data) {
                return Buffer.from(part.body.data, "base64").toString("utf-8");
              }
              if (part.parts) {
                const nested = extractBody(part.parts, preferred);
                if (nested) return nested;
              }
            }
            return "";
          }

          let body = "";
          if (payload.parts) {
            body = extractBody(payload.parts, "text/plain");
            if (!body) body = extractBody(payload.parts, "text/html");
          } else if (payload.body?.data) {
            body = Buffer.from(payload.body.data, "base64").toString("utf-8");
          }

          const parsedBooking: ParseResult & { historyId?: string } =
            parseBookingEmail(body);

          console.log("Parsed Booking Email:", parsedBooking);

          if (parsedBooking.isBooking) {
            try {
              const newBooking = new Booking({
                username: parsedBooking.username,
                venueName: parsedBooking.venue,
                location: parsedBooking.location,
                bookingId: parsedBooking.bookingId,
                bookedDate: parsedBooking.bookedDate,
                bookedTime: parsedBooking.bookedTime,
                sport: parsedBooking.sport,
                court: parsedBooking.court,
                slot: {
                  startTime: parsedBooking.startTime,
                  endTime: parsedBooking.endTime,
                  startDate: parsedBooking.startDate,
                  endDate: parsedBooking.endDate,
                },
                price: {
                  totalAmount: parsedBooking.totalAmount,
                  courtPrice: parsedBooking.courtPrice,
                  convenienceFee: parsedBooking.convenienceFee,
                  discount: parsedBooking.discount,
                  advancePaid: parsedBooking.advancePaid,
                  paidOnline: parsedBooking.paidOnline,
                  payableAtVenue: parsedBooking.payableAtVenue,
                },
                rawBody: body,
              });

              await newBooking.save();
              console.log(`✅ Booking saved: ${parsedBooking.bookingId}`);
            } catch (dbErr: any) {
              if (dbErr.code === 11000)
                console.log(
                  `⏭️ Booking with ID ${parsedBooking.bookingId} already exists.`
                );
              else console.error("❌ Error saving booking:", dbErr);
            }
          }

          const result = await Email.findOneAndUpdate(
            { messageId: msg.id },
            {
              $setOnInsert: {
                messageId: msg.id,
                historyId: parsedBooking.historyId || startHistoryId,
                from,
                subject,
                body,
                accessTokenUsed: state.tokens.access_token!,
              },
            },
            { upsert: true, new: false }
          );

          if (!result) console.log(`✅ Email saved to MongoDB: ${msg.id}`);
          else console.log(`⏭️ Duplicate email skipped: ${msg.id}`);
        } catch (innerErr: any) {
          if (innerErr.code === 404)
            console.error(`⚠️ Message ${msg.id} not found. Skipping.`);
          else console.error("❌ Error fetching message:", innerErr);
        }
      }
    }

    await SyncState.findByIdAndUpdate(
      "gmail-sync-state",
      { lastHistoryId: history.data.historyId || parsedPayload.historyId! },
      { upsert: true, new: true }
    );
  } catch (err: any) {
    if (err.code === 404) {
      console.error("⚠️ History ID too old or invalid. Restarting watch...");
      if (req.restartWatch) await req.restartWatch(gmail);
    } else {
      console.error("❌ Error fetching email details:", err);
    }
  }
});

export default router;
