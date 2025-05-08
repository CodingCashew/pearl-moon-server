export default async function handler(req, res) {
  console.log("in handler for send-error-email.js, huzzah! ------------------------------->", req.body);

  if (req.method === "POST") {
    console.log('in handler for send-error-email.js, huzzah! ------------------------------->', req.body);
    const { orderId, customerName, distributor, timeStamp, errorMessage } = req.body;

    try {
      // Prepare the template parameters
      const templateParams = {
        orderId: orderId,
        customerName: customerName,
        distributor: distributor,
        timeStamp: timeStamp,
        errorMessage: errorMessage,
      };
      console.log("Sending email with the following data:", {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: templateParams,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
      });
      // Use fetch to call the EmailJS REST API
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          template_params: templateParams,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      return res.status(200).json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ message: "Failed to send email", error: error.message });
    }
  }

  return res.status(400).json({ message: "Bad request; method not POST" });
}


// import { SMTPClient } from "emailjs";
// import emailjs from "emailjs";

// export default async function handler(req, res) {
//   console.log('in handler for send-error-email.js, huzzah! ------------------------------->', req.body);
//   if (req.method === "POST") {
//     const { orderId, customerName, distributor, timeStamp, errorMessage } = req.body;

//     // try {
//     //   // Create an SMTP client
//     //   const client = new SMTPClient({
//     //     user: process.env.EMAILJS_USER,
//     //     password: process.env.EMAILJS_PASSWORD,
//     //     host: process.env.EMAILJS_HOST,
//     //     ssl: true,
//     //   });

//     //   // Send the email
//     //   await client.sendAsync({
//     //     text: `Error Message: ${errorMessage}\nOrder ID: ${orderId}\nCustomer Name: ${customerName}\nDistributor: ${distributor}\nTimestamp: ${timeStamp}`,
//     //     from: process.env.EMAILJS_FROM,
//     //     to: process.env.EMAILJS_TO,
//     //     subject: "Error Notification",
//     //   });

//     //   return res.status(200).json({ message: "Email sent successfully" });
//     // } catch (error) {
//     //   console.error("Error sending email:", error);
//     //   return res.status(500).json({ message: "Failed to send email" });
//     // }

//     try {
//       // send email to myself with emailjs
//       const templateParams = {
//         order: orderId,
//         customerName: customerName,
//         distributor: distributor,
//         timeStamp: timeStamp,
//         errorMessage: errorMessage
//       };
//       // do I need to use the sendForm method?
//       await emailjs.send(
//         process.env.EMAILJS_SERVICE_ID,
//         process.env.EMAILJS_TEMPLATE_ID,
//         templateParams,
//         process.env.EMAILJS_PUBLIC_KEY
//       );

//       return res.status(200).json({ success: true });
//     } catch (error) {
//       console.log("error: ", error);
//       return res.status(400).json({ message: error.message });
//     }
//   }

//   return res.status(400).json({ message: "Bad request; method not POST" });
// }
