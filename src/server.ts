import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";

import authRoutes from "./routes/auth";
import homeRoutes from "./routes/home";
import webhookRoutes from "./routes/webhook";

import "./config/passport"; // Passport setup
import { restartWatchMiddleware } from "./helpers/gmail";
import connectDB from "./config/db"; // Import DB connection

const PORT: string | undefined = process.env.PORT;
const app = express();

// ===== Connect to MongoDB =====
connectDB();

app.use(express.json({ limit: "50mb" }));

// ===== Session =====
app.use(
  session({
    secret: "some_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// ===== Passport =====
app.use(passport.initialize());
app.use(passport.session());

// ===== Gmail Middleware =====
app.use(
  restartWatchMiddleware as (
    req: Request,
    res: Response,
    next: NextFunction
  ) => void
);

// ===== Routes =====
app.use("/auth", authRoutes);
app.use("/webhook", webhookRoutes);
app.use("/", homeRoutes);

// ===== Start Server =====
app.listen(PORT, () => console.log("🚀 Server is running on port", PORT));
