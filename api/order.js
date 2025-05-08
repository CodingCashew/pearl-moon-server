require("dotenv").config();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const order = req.body;

  let sendErrorStatus = false;

  // TODO: make sure this groups items in one order to the same distributor
  for (const item of order.line_items) {
    const distributor = getDistributor(item);

    if (distributor === "sexology") {
      await sendToSexology(item, order);
    } else if (distributor === "honeysplace") {
      await sendToHoneysPlace(item, order);
    } else {
      await sendErrorEmail("Unknown distributor", item);
      sendErrorStatus = true;
    }
  }
  if (sendErrorStatus) {
    return res.status(400).send("Unknown distributor");
  }

  res.status(200).send("OK");
}

async function sendToSexology(item, order) {
  console.log("Sending to Sexology:", item);
}
async function sendToHoneysPlace(item, order) {
  console.log("Sending to Honey's Place:", item);
}

function getDistributor(item) {
  if (item.distributor === "sexology") {
    return "sexology";
  } else if (item.distributor === "honeysplace") {
    return "honeysplace";
  } else {
    return "unknown";
  }
}
async function sendErrorEmail(message, item) {
  const sendErrorEmailUrl = "http://localhost:3000";
  // const sendErrorEmailUrl = process.env.BASE_URL || "http://localhost:3000";

  await fetch(`${sendErrorEmailUrl}/api/send-error-email`, {
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
