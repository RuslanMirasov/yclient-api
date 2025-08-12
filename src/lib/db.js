import mongoose from "mongoose";

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) throw new Error("MONGODB_URI is missing");

let cached =
  global._mongoose || (global._mongoose = { conn: null, promise: null });

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 5,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
