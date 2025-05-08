import emailjs from "@emailjs/browser";

export default async function handler(req, res) {
  console.log('in handler for send-error-email.js, huzzah! ------------------------------->', req.body);
  if (req.method === "POST") {
    const { orderId, customerName, distributor, timeStamp, errorMessage } = req.body;

    try {
      // send email to myself with emailjs
      const templateParams = {
        order: orderId,
        customerName: customerName,
        distributor: distributor,
        timeStamp: timeStamp,
        errorMessage: errorMessage
      };
      // do I need to use the sendForm method?
      await emailjs.send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_TEMPLATE_ID,
        templateParams,
        process.env.EMAILJS_PUBLIC_KEY
      );

      return res.status(200).json({ success: true });
    } catch (error) {
      console.log("error: ", error);
      return res.status(400).json({ message: error.message });
    }
  }

  return res.status(400).json({ message: "Bad request; method not POST" });
}
