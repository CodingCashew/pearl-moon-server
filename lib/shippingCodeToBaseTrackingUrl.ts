import sendErrorEmail from "../api/send-error-email.js";

export async function shippingCodeToBaseTrackingUrl(
  carrierName: string,
  trackingNumber: string
): Promise<string> {
  // TODO: Add more carriers and their tracking URLs as needed
  const baseUrls = {
    "Priority Mail": `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`,
  };
  console.log("carrierName, trackingNumber:", carrierName, trackingNumber);

  if (!carrierName || !trackingNumber || !baseUrls[carrierName]) {
    await sendErrorEmail({
      orderId: "unknown",
      customerName: "unknown",
      timeStamp: new Date().toISOString(),
      errorMessage:
        "Carrier name or tracking number is missing. Carrier name: " +
        carrierName +
        ", tracking number: " +
        trackingNumber,
    });
    throw new Error("Carrier name and tracking number are required.");
  }

  return baseUrls[carrierName] || "";
}
