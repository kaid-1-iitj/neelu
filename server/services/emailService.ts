import dotenv from "dotenv";
import type { EmailNotificationRequest } from "@shared/api";

dotenv.config();

const EMAIL_SERVICE_API_KEY = process.env.EMAIL_SERVICE_API_KEY;
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL;
const EMAIL_FROM = process.env.EMAIL_FROM;

export async function sendEmailNotification(request: EmailNotificationRequest): Promise<boolean> {
  if (!EMAIL_SERVICE_API_KEY || !EMAIL_SERVICE_URL || !EMAIL_FROM) {
    console.warn("Email service not configured. Skipping email notification.");
    return false;
  }

  try {
    const response = await fetch(`${EMAIL_SERVICE_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${EMAIL_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: request.to,
        subject: request.subject,
        text: request.body,
        html: request.htmlBody || request.body,
      }),
    });

    if (!response.ok) {
      console.error("Email service error:", await response.text());
      return false;
    }

    console.log(`Email sent successfully to: ${request.to.join(", ")}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendExpenseNotification(
  societyName: string,
  billDetails: {
    vendorName: string;
    amount: number;
    transactionNature: string;
    dueDate: number;
  },
  recipients: string[]
): Promise<boolean> {
  const subject = `New Expense Added - ${societyName}`;
  const body = `
A new expense has been added to ${societyName}:

Vendor: ${billDetails.vendorName}
Amount: ₹${billDetails.amount.toLocaleString()}
Nature: ${billDetails.transactionNature}
Due Date: ${new Date(billDetails.dueDate).toLocaleDateString()}

Please review this expense in the Society Ledgers system.

Best regards,
Society Ledgers Team
  `;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Expense Added - ${societyName}</h2>
      <p>A new expense has been added to <strong>${societyName}</strong>:</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Vendor:</strong> ${billDetails.vendorName}</p>
        <p><strong>Amount:</strong> ₹${billDetails.amount.toLocaleString()}</p>
        <p><strong>Nature:</strong> ${billDetails.transactionNature}</p>
        <p><strong>Due Date:</strong> ${new Date(billDetails.dueDate).toLocaleDateString()}</p>
      </div>
      
      <p>Please review this expense in the Society Ledgers system.</p>
      
      <p style="color: #666; font-size: 14px;">
        Best regards,<br>
        Society Ledgers Team
      </p>
    </div>
  `;

  return sendEmailNotification({
    to: recipients,
    subject,
    body,
    htmlBody,
  });
}
