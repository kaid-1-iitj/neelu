import "dotenv/config";
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import apiRouter from "./routes/api";
import { connectToDatabase } from "./db/connect";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health
  app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Society Ledgers API
  app.use("/api", apiRouter);

  // Static file serving for uploads
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // Database Connection Check and Server Start Log
  connectToDatabase().then(() => {
    console.log("MongoDB connected successfully!");
  }).catch(err => {
    console.error("MongoDB connection failed:", err);
  });

  return app;
}
