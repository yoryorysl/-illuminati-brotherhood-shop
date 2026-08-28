const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

app.post("/api/create-invoice", async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: "Invalid payment amount."
      });
    }

    const btcpayUrl =
      process.env.BTCPAY_URL?.replace(/\/+$/, "");

    const storeId =
      process.env.BTCPAY_STORE_ID;

    const apiKey =
      process.env.BTCPAY_API_KEY;

    if (!btcpayUrl || !storeId || !apiKey) {
      console.error(
        "Missing BTCPay environment variables."
      );

      return res.status(500).json({
        error: "BTCPay configuration is incomplete."
      });
    }

    const invoiceUrl =
      `${btcpayUrl}/api/v1/stores/${encodeURIComponent(storeId)}/invoices`;

    console.log(
      "Creating BTCPay invoice for amount:",
      amount
    );

    const response = await fetch(invoiceUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `token ${apiKey}`
      },

      body: JSON.stringify({
        amount: amount.toFixed(2),
        currency: "USD"
      })
    });

    const responseText =
      await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        message: responseText
      };
    }

    if (!response.ok) {
      console.error(
        "BTCPay returned HTTP",
        response.status,
        data
      );

      return res.status(502).json({
        error:
          "BTCPay rejected the invoice request.",
        status: response.status
      });
    }

    if (!data.checkoutLink) {
      console.error(
        "BTCPay response did not contain checkoutLink:",
        data
      );

      return res.status(502).json({
        error:
          "BTCPay did not provide a checkout link."
      });
    }

    console.log(
      "BTCPay invoice created successfully."
    );

    return res.json({
      invoiceId: data.id,
      checkoutLink: data.checkoutLink
    });

  } catch (error) {

    console.error(
      "Payment server error:",
      error.message
    );

    return res.status(500).json({
      error: "Payment server error."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
