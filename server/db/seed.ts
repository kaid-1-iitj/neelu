import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { UserRole } from "../../shared/api";
import { Collection } from "mongodb";
import { UserDoc, SocietyDoc, BillDoc, CreateSocietyRequest, CreateBillRequest, MemberInvitationDoc } from "../../shared/api";
import { hashPassword } from "../middleware/auth"; // Import hashPassword

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in the .env file");
}

if (!DB_NAME) {
  throw new Error("DB_NAME is not defined in the .env file");
}

async function getCollection<T>(collectionName: string): Promise<Collection<T>> {
  const isProduction = process.env.NODE_ENV === "production";
  const clientOptions = isProduction
    ? {}
    : { tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true };
  const client = new MongoClient(MONGODB_URI as string, clientOptions as any);
  await client.connect();
  const db = client.db(DB_NAME);
  return db.collection<T>(collectionName);
}

async function seed() {
  console.log("Starting data seeding...");

  const usersCol = await getCollection<UserDoc>("users");
  const societiesCol = await getCollection<SocietyDoc>("societies");
  const billsCol = await getCollection<BillDoc>("bills");
  const invitationsCol = await getCollection<MemberInvitationDoc>("memberInvitations");

  // Clear existing data
  await usersCol.deleteMany({});
  await societiesCol.deleteMany({});
  await billsCol.deleteMany({});
  await invitationsCol.deleteMany({});
  console.log("Cleared existing data.");

  // Seed Users
  const usersToSeed = [
    { email: "admin@example.com", name: "Admin User", role: "Admin" as UserRole, password: "password123" },
    { email: "manager@example.com", name: "Manager User", role: "Manager" as UserRole, password: "password123" },
    { email: "treasurer@example.com", name: "Treasurer User", role: "Treasurer" as UserRole, password: "password123" },
    { email: "agent1@example.com", name: "Agent One", role: "Agent" as UserRole, password: "password123" },
    { email: "agent2@example.com", name: "Agent Two", role: "Agent" as UserRole, password: "password123" },
  ];

  const insertedUsers = [];
  for (const userData of usersToSeed) {
    const hashedPassword = await hashPassword(userData.password); // Hash password using bcrypt
    const user: UserDoc = {
      uid: Math.random().toString(36).substring(2, 15), // Simple unique ID
      ...userData,
      password: hashedPassword,
      isEmailVerified: true,
      isActive: true,
      createdAt: Date.now(),
    };
    await usersCol.insertOne(user);
    insertedUsers.push(user);
    console.log(`Seeded user: ${user.email}`);
  }

  // Seed Societies
  const adminUser = insertedUsers.find(u => u.role === "Admin");
  const managerUser = insertedUsers.find(u => u.role === "Manager");

  const societiesToSeed: CreateSocietyRequest[] = [
    {
      name: "First Society",
      address: { street: "123 Main St", city: "Anytown", state: "CA", zip: "12345" },
      contactInfo: { email: "first@society.com", phone: "555-111-2222" },
      members: [{ role: "Manager", email: managerUser!.email }],
    },
    {
      name: "Second Society",
      address: { street: "456 Oak Ave", city: "Otherville", state: "NY", zip: "67890" },
      contactInfo: { email: "second@society.com" },
      members: [],
    },
  ];

  const insertedSocieties = [];
  for (const societyData of societiesToSeed) {
    const society: SocietyDoc = {
      ...societyData,
      isActive: true,
      createdAt: Date.now(),
    };
    const result = await societiesCol.insertOne(society);
    insertedSocieties.push({ ...society, _id: result.insertedId });
    console.log(`Seeded society: ${society.name}`);
  }

  // Associate the manager with the first society
  if (managerUser && insertedSocieties.length > 0) {
    await usersCol.updateOne(
      { uid: managerUser.uid },
      { $set: { associatedSocietyId: String(insertedSocieties[0]._id) } }
    );
    console.log(`Associated manager with society: ${insertedSocieties[0].name}`);
  }

  // Associate agents with societies
  const agent1 = insertedUsers.find(u => u.email === "agent1@example.com");
  const agent2 = insertedUsers.find(u => u.email === "agent2@example.com");
  
  if (agent1 && insertedSocieties.length > 0) {
    await usersCol.updateOne(
      { uid: agent1.uid },
      { $set: { assignedSocieties: [String(insertedSocieties[0]._id)] } }
    );
    console.log(`Associated agent1 with society: ${insertedSocieties[0].name}`);
  }
  
  if (agent2 && insertedSocieties.length > 1) {
    await usersCol.updateOne(
      { uid: agent2.uid },
      { $set: { assignedSocieties: [String(insertedSocieties[1]._id)] } }
    );
    console.log(`Associated agent2 with society: ${insertedSocieties[1].name}`);
  }

  // Seed Bills
  const firstSociety = insertedSocieties[0];
  const treasurerUser = insertedUsers.find(u => u.role === "Treasurer");

  const billsToSeed: CreateBillRequest[] = [
    {
      societyId: String(firstSociety._id),
      vendorName: "Utility Company",
      transactionNature: "Electricity Bill",
      amount: 150.75,
      dueDate: Date.now() + 86400000 * 30, // 30 days from now
      attachments: [],
    },
    {
      societyId: String(firstSociety._id),
      vendorName: "Cleaning Services",
      transactionNature: "Monthly Cleaning",
      amount: 200.00,
      dueDate: Date.now() + 86400000 * 15, // 15 days from now
      attachments: [],
    },
  ];

  for (const billData of billsToSeed) {
    const bill: BillDoc = {
      ...billData,
      status: "Pending",
      submittedBy: treasurerUser!.uid,
      createdAt: Date.now(),
      remarks: [],
    };
    await billsCol.insertOne(bill);
    console.log(`Seeded bill for society ${bill.societyId}`);
  }

  console.log("Data seeding complete.");
  process.exit(0);
}

seed().catch(console.error);
