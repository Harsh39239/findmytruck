# Messaging the driver on WhatsApp and SMS

When the manager creates a trip with the driver's mobile number, the app sends one message to the driver on
**WhatsApp and SMS at the same time**:

```
FindMyTruck | MH12 AB 1234
हिंदी के लिए 1 भेजें
தமிழுக்கு 2 அனுப்பவும்
മലയാളത്തിന് 3 അയയ്ക്കുക
For English send 4
```

The driver replies with a number. From then on everything is in their language:

| Driver sends | The app does |
|---|---|
| `1` `2` `3` `4` | Records Reached, Loaded, Left or Delivered and confirms in their language |
| A photo of the slip (WhatsApp) | Reads the weight, checks it against the expected weight |
| Any other text | Translates it with AI and decides OK or Review |
| `0` | Shows the language menu again |
| `menu` | Shows the choices again |

Every reply updates the manager's screen by itself. Only the manager has an account.

## Connecting it (Twilio)

Nothing is sent until these are set. Without them the app still works: the manager screen says messaging is not
connected, opens WhatsApp with the driver's web link ready to send, and the "Demo: reply as the driver" panel on a
truck's page shows the whole conversation without a phone.

1. Create an account at https://www.twilio.com and copy the **Account SID** and **Auth Token**.
2. For WhatsApp, join the Twilio sandbox (Messaging > Try it out > Send a WhatsApp message). Each driver phone must send
   the `join ...` code once. A production sender needs a Meta-approved WhatsApp Business account and message templates.
3. For SMS, buy or use a Twilio number that can send to your drivers. Sending SMS to Indian numbers needs DLT
   registration of the sender and message template.
4. Set these in Vercel (Settings > Environment Variables) and in `.env.local` for local use:

   | Name | Example |
   |---|---|
   | `TWILIO_ACCOUNT_SID` | `AC...` |
   | `TWILIO_AUTH_TOKEN` | the token |
   | `TWILIO_FROM_WHATSAPP` | `whatsapp:+14155238886` |
   | `TWILIO_FROM_SMS` | `+1...` (a Twilio number) |

   Either sender can be left out: the app uses whichever channels are configured.
5. In the Twilio console, set the incoming-message webhook (HTTP POST) of **both** the WhatsApp sandbox and the SMS
   number to `https://<your-site>/api/inbound`.
6. Redeploy, create a trip with your own number, and reply `2`.

## Safety

- `/api/inbound` rejects any request without a valid Twilio signature (HMAC-SHA1 of the URL and fields with the auth
  token), so nobody else can post fake replies.
- The driver's number is stored on the server only, to match replies to the trip. It is never sent to a browser.
- SMS cannot carry slip photos. Photos need WhatsApp (or the driver web page).
- SMS in Hindi, Tamil and Malayalam is sent as Unicode, which fits 70 characters per segment, so the long first
  message costs several segments.
