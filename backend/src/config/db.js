import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.LIBRARYDIGITAL_DB_URI);
let db;

export async function connectDB() {
  try {
    await client.connect();
    db = client.db(process.env.LIBRARYDIGITAL_DB_NAME);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ DB connection failed:", error);
    process.exit(1);
  }
}

export function getDB() {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
}
