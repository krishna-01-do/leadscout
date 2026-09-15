import "server-only";

export function contactNotificationConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL && process.env.CONTACT_TO_EMAIL);
}

export async function sendContactNotification(message: { name: string; email: string; subject: string; message: string }) {
  if (!contactNotificationConfigured()) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL,
      to: [process.env.CONTACT_TO_EMAIL],
      reply_to: message.email,
      subject: `[LeadScout] ${message.subject}`,
      text: `Name: ${message.name}\nEmail: ${message.email}\n\n${message.message}`,
    }),
    cache: "no-store",
  });
  return response.ok;
}
