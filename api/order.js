require("dotenv").config();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const order = req.body;
  console.log("New order received:", order);

  // Iterate through the order items
  // TODO: make sure this groups items in one order to the same distributor
  for (const item of order.line_items) {
    const distributor = getDistributor(item);

    if (distributor === "sexology") {
      await sendToSexology(item, order);
    } else if (distributor === "honeysplace") {
      await sendToHoneysPlace(item, order);
    } else {
      sendErrorEmail("Unknown distributor", item);
      res.status(400).send("Unknown distributor");
    }
  }

  res.status(200).send("OK");
}

async function sendToSexology(item, order) {
  // Logic to send the order item to Sexology
  console.log("Sending to Sexology:", item);
  // Example: await axios.post('https://sexology.com/api', { item, order });
}
async function sendToHoneysPlace(item, order) {
  // Logic to send the order item to some other distributor
  console.log("Sending to Honey's Place:", item);
  // Example: await axios.post('https://someother.com/api', { item, order });
}

function getDistributor(item) {
  // Logic to determine the distributor from the item
  // This could be based on a metafield, tag, or any other property
  if (item.distributor === "sexology") {
    return "sexology";
  } else if (item.distributor === "honeysplace") {
    return "honeysplace";
  } else {
    return "unknown";
  }
}
function sendErrorEmail(message, item) {
  // Logic to notify you about the unknown distributor
  console.log(message, item);
  // Example: send an email or a message to a Slack channel
  // call the handler for send-error-email.js
  const environment = process.env.NODE_ENV || "development";
  console.log('environment: ', environment);
  const sendErrorEmailUrl =
    environment === "production"
      ? "https://pearl-moon-server.vercel.app"
      : "http://localhost:3000";
  console.log('sendErrorEmailUrl: ', sendErrorEmailUrl);

  fetch(`${sendErrorEmailUrl}/api/send-error-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId: item.id,
      customerName: item.customer_name,
      distributor: item.distributor,
      timeStamp: new Date().toISOString(),
      errorMessage: message,
    }),
  });
}
