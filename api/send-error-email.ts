export default async function sendErrorEmail({
  orderId,
  customerName = "Customer Name Not Provided",
  timeStamp,
  errorMessage,
}: {
  orderId: string;
  customerName?: string;
  timeStamp: string;
  errorMessage: string;
}) {
  try {
    const templateParams = {
      orderId,
      customerName,
      timeStamp,
      errorMessage,
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
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          template_params: templateParams,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
