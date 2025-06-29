export default async function sendLizNotification({
  type,
  action = "Cron Job?",
  timeStamp,
  subject,
  body,
}: {
  type: string;
  action?: string;
  timeStamp: string;
  subject: string;
  body: string;
}) {
  try {
    const templateParams = {
      type,
      action,
      timeStamp,
      subject,
      body,
    };

    const response = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID_LIZ,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          template_params: templateParams,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to send email: ${response.statusText} in send-liz-notification.ts`
      );
    }
    const data = await response.json();
    console.log("Email sent successfully:", data);
    return { success: true, message: "Email sent successfully. Data: " + JSON.stringify(data) };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, message: "Error sending email" };
  }
}
