import twilio from "twilio";
const TWILIO_ACCOUNT_SID = "AC35d86e0d9c60d2eb91c76053c7c863e1";
const TWILIO_AUTH_TOKEN = "ee3d620954c9e24f4388300475d433e7";

export const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
