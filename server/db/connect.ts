import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

let client: MongoClient | null = null;

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in the .env file");
  }
  if (!DB_NAME) {
    throw new Error("DB_NAME is not defined in the .env file");
  }

  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db(DB_NAME);
}

export async function getClient() {
  if (!client) {
    await connectToDatabase();
  }
  return client;
}
