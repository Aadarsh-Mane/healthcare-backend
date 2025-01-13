import twilio from "twilio";

const accountSid = "AC35d86e0d9c60d2eb91c76053c7c863e1";
const authToken = "ee3d620954c9e24f4388300475d433e7";

const client = twilio(accountSid, authToken);

const sendSMS = async (body) => {
  const msgOptions = {
    from: "+14152149378",
    to: "+919167787316",
    body,
  };

  try {
    const message = await client.messages.create(msgOptions);
    console.log(message);
  } catch (error) {
    console.error(error);
  }
};

sendSMS("Hello from Node.js App");
