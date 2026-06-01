import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Persist connection across hot reloads / serverless invocations.
let cached = (global as any).__mongoose as Cached | undefined;
if (!cached) {
  cached = (global as any).__mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (!MONGODB_URI || MONGODB_URI.includes("PASTE_YOUR")) {
    throw new Error(
      "MONGODB_URI is not set. Open .env.local and paste your MongoDB Atlas connection string."
    );
  }
  if (cached!.conn) return cached!.conn;
  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cached!.conn = await cached!.promise;
  return cached!.conn;
}
