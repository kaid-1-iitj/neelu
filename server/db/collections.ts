import type { BillDoc, RemarkDoc, SocietyDoc, UserDoc, MemberInvitationDoc, OTPVerificationDoc } from "@shared/api";
import type { Collection } from "mongodb";
import { connectToDatabase } from "./connect";

export async function users(): Promise<Collection<UserDoc>> {
  const db = await connectToDatabase();
  return db.collection<UserDoc>("users");
}

export async function societies(): Promise<Collection<SocietyDoc>> {
  const db = await connectToDatabase();
  return db.collection<SocietyDoc>("societies");
}

export async function bills(): Promise<Collection<BillDoc>> {
  const db = await connectToDatabase();
  return db.collection<BillDoc>("bills");
}

export async function memberInvitations(): Promise<Collection<MemberInvitationDoc>> {
  const db = await connectToDatabase();
  return db.collection<MemberInvitationDoc>("memberInvitations");
}

export async function otpVerifications(): Promise<Collection<OTPVerificationDoc>> {
  const db = await connectToDatabase();
  return db.collection<OTPVerificationDoc>("otpVerifications");
}
