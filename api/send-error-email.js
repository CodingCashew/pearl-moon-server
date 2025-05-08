export default async function handler(req, res) {
  if (req.method === "POST") {
    const { orderId, customerName, distributor, timeStamp, errorMessage } =
      req.body;

    try {
      const templateParams = {
        orderId: orderId,
        customerName: customerName,
        distributor: distributor,
        timeStamp: timeStamp,
        errorMessage: errorMessage,
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

      return res
        .status(200)
        .json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      return res
        .status(500)
        .json({ message: "Failed to send email", error: error.message });
    }
  }

  return res.status(400).json({ message: "Bad request; method not POST" });
}
