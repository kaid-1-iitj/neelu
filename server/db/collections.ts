import type { BillDoc, RemarkDoc, SocietyDoc, UserDoc } from "@shared/api";
import type { Collection } from "mongodb";
import { connectToDatabase } from "./connect";

export async function users(): Promise<Collection<UserDoc>> {
  const db = await connectToDatabase();
  return db.collection<UserDoc>("users");
}

export async function societies(): Promise<Collection<SocietyDoc & { _id: string }>> {
  const db = await connectToDatabase();
  return db.collection<SocietyDoc & { _id: string }>("societies");
}

export async function bills(): Promise<Collection<BillDoc & { _id: string; remarks?: RemarkDoc[] }>> {
  const db = await connectToDatabase();
  return db.collection<BillDoc & { _id: string; remarks?: RemarkDoc[] }>("bills");
}
