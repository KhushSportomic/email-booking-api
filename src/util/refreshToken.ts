// util/refreshToken.ts

import "dotenv/config";
import { google } from "googleapis";
import mongoose from "mongoose";
import axios from "axios";
import SyncState from "../models/SyncState";

interface Tokens {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}

class TokenManager {
  public oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private tokenExpiryTime: number | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  }

  async saveTokens(tokens: Tokens) {
    if (tokens.expiry_date) {
      console.log("Using expiry_date from tokens");
      this.tokenExpiryTime = tokens.expiry_date;
      console.log("expiry_date:", this.tokenExpiryTime);
    } else {
      try {
        const res = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${tokens.access_token}`
        );
        const expiresIn = Number(res.data.expires_in);
        console.log("expiresIn from google:", expiresIn);

        if (expiresIn) {
          this.tokenExpiryTime = Date.now() + expiresIn * 1000;
        } else {
          throw new Error("Google did not return expires_in.");
        }
      } catch (err: any) {
        console.warn("Failed to verify access token with Google:", err.message);
        await this.refreshAccessToken();
        return;
      }
    }

    if (!this.tokenExpiryTime) {
      throw new Error("No expiry info available for tokens.");
    }

    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: this.tokenExpiryTime,
    });

    console.log(
      `✅ Access token set. Expires in ${Math.max(
        0,
        Math.floor((this.tokenExpiryTime - Date.now()) / 60000)
      )} minutes.`
    );

    await SyncState.findByIdAndUpdate(
      "gmail-sync-state",
      {
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: this.tokenExpiryTime,
        },
      },
      { upsert: true, new: true }
    );

    this.scheduleTokenRefresh();
  }

  async getLatestTokens(): Promise<Tokens> {
    const state = await SyncState.findById("gmail-sync-state");
    if (!state || !state.tokens) {
      throw new Error("No tokens found in DB.");
    }
    return state.tokens as Tokens;
  }

  async refreshAccessToken() {
    let tokens: Tokens;
    try {
      tokens = await this.getLatestTokens();
    } catch (err: any) {
      console.error("❌", err.message);
      return;
    }
    if (!tokens.refresh_token) {
      console.error("❌ No refresh token available in DB.");
      return;
    }

    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      console.log("new Access token:", credentials.access_token);
      console.log("savedtoken expiry date", credentials.expiry_date);
      await this.saveTokens(credentials as Tokens);
      console.log("🔄 Access token refreshed successfully.");
    } catch (error: any) {
      console.error("⚠️ Error refreshing access token:", error.message);
    }
  }

  async scheduleTokenRefresh() {
    if (!this.tokenExpiryTime) return;
    const now = Date.now();
    const timeUntilExpiry = this.tokenExpiryTime - now;

    const refreshBeforeMinutes = Number(process.env.REFRESH_BEFORE_MIN || 5);
    const refreshBefore = (refreshBeforeMinutes || 5) * 60 * 1000;
    const refreshIn = timeUntilExpiry - refreshBefore;

    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);

    if (refreshIn > 0) {
      console.log(
        `⏳ Will refresh token in ${(refreshIn / 1000 / 60).toFixed(
          2
        )} minutes.`
      );
      this.refreshTimeout = setTimeout(
        () => this.refreshAccessToken(),
        refreshIn
      );
    } else {
      console.log("⚠️ Token already near expiry, refreshing now...");
      await this.refreshAccessToken();
    }
  }
}

const tokenManager = new TokenManager();

export const oauth2Client = tokenManager.oauth2Client;
export const saveTokens = (tokens: Tokens) => tokenManager.saveTokens(tokens);
export const refreshAccessToken = () => tokenManager.refreshAccessToken();
export default tokenManager;
