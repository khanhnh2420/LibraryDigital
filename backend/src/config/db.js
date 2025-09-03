import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "LibraryDigital";

let client, db;

export async function connectDB() {
  if (db) return db;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log("✅ Connected to MongoDB");
  return db;
}
export function getDB() {
  if (!db) throw new Error("Database not initialized. Call connectDB first.");
  return db;
}
export function getClient() {
  if (!client) throw new Error("Mongo client not initialized");
  return client;
}
