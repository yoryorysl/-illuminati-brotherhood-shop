const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Create BTCPay invoice
app.post("/api/create-invoice", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        error: "Invalid amount"
      });
    }

    const btcpayUrl = process.env.BTCPAY_URL;
    const storeId = process.env.BTCPAY_STORE_ID;
    const apiKey = process.env.BTCPAY_API_KEY;

    if (!btcpayUrl || !storeId || !apiKey) {
      return res.status(500).json({
        error: "BTCPay environment variables are not configured."
      });
    }

    const response = await fetch(
      `${btcpayUrl}/api/v1/stores/${storeId}/invoices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `token ${apiKey}`
        },
        body: JSON.stringify({
          amount: String(amount),
          currency: "USD"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("BTCPay error:", data);

      return res.status(response.status).json({
        error: "Unable to create BTCPay invoice."
      });
    }

    res.json({
      invoiceId: data.id,
      checkoutLink: data.checkoutLink
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Payment server error."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
