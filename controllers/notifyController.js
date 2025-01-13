import admin from "firebase-admin";
import patientSchema from "./../models/patientSchema.js";
import hospitalDoctors from "./../models/hospitalDoctorSchema.js";
// Initialize Firebase Admin SDK (ensure you've set up Firebase in your project)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "doctor-fc359",
      clientEmail:
        "firebase-adminsdk-lcnp1@doctor-dd7e8.iam.gserviceaccount.com",

      privateKey:
        "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDfDJQlE1FZjxrt\noArtc7GbLDS8TBLoj66ME8w7kT5nXw+CdSrxCvrNeymrgectFrlosPhZQAa2aNoX\nhUotNvBSMEhj2q/5gO4lA3b6WhT6SWBv+vQZOhk5sa6iq34NUP25gHt7RH5HfMZF\nlzCiQtqSh/4TdpddUL5AUf5e4uwKKu+4Z1lUPBUSmrCbLKnYhiHV8TlQn4S7qPto\nIiad7NVC9a3xQ5G+DAvAXs43rlskrNG52mnbXeNv2r6vQQWXybIsfem+97d94Yl2\nZ5j6c1LQRwZjcH1VdoUg3zVA4OuLJPvZl7D+9bqAaEqAmpoiNipFK5RyvSba/ZXi\nExftm2FxAgMBAAECgf8Dzi0cpa3rN1joakdn215Z78/pcNGdowYUv8lKKEvoxl8v\nxtD/kwIZ554hIgtkzapRdih2tA4vdLOdTOvIFenB/pYMCW6Wd8qVk/rCSwYeBIq4\nkqqBGFKBjReG7/vAXmjENkALmzL8gtV8uyUy5xBmf8M0ZLpXQS5jnG3cHEQHON1Y\niXIcnbRq9p9IVITY2RMP5dcqhSCkg4iQ0OdVMxmVH9CdT7Ujnri4dh1XAxsDBIQt\njCcaujZipot8wbAuR6FQ8zPb9mptZMEKmW2szlP2w35sDacLwHxw9p02cnZ5TmYl\nR3U2SSBY85+FHn/vl2VcC2n2KGSpcS9Y5XFmlUECgYEA/EnpENoST7ZOOmAaJhHQ\nsa+DSfulXLObtP62KI5DIw0zzGXhZY7YhXQYCnGSS8k+fSDXi77DP/bK6CDRcg/o\nlLVpvpEtZhQI61REpS1PfLWN650IGDkQMy5POvOfDRN/8pE6g8N3doKtJLcuzFV/\npacg2NY/1PvxowCL88uuezECgYEA4lSOM3kGAPuglBeoBLbCOynn4tdhuBTh56qI\ndR7Xqwxzju44QFbFhGCr+G1rAhk+mIv52Hquv6+Sh4f+AVHl+U8+jgstQwfA/LNq\nPuj1foP2E2T8x3F+Aj5R9g0BspHx5RFVGjYVTpWKItb92XaKkRqxonmF3zfVd80N\nCTF1OkECgYARKU3rUYoxVetYWTUuJcQWciPyImYLOkR7OWBWveafOcSuQLfmWqMr\n4MvJ2hPjh9ryVAuVe/J4JWeEBsd4hNCDXRvGVMXLzc0VhPPucHiZuRfgURw92ZPa\nh2noTq4hC5SGgY6DbAZyT01L1BIg4CgAsq+vUFOjP0gemGjsuowx4QKBgQCsFwzU\nuHXHM4yibeZURz4iTDfD9G6Z0E8AnlsJar0jkuEe0aU1zoR6piK8Tz4pJ1bAGNaN\nMqNCntX0dYO+Ly6ExStUR81PhUrJGgZz9SAM5XuqvYOyhmoAfLBHPRaIV44s1WP2\n/R5wVSXmXcBApHCx6jEcz/fphQOsBt6dmdx/wQKBgETYeyDe4l4H/mhHjyBuSRSJ\nGw39vOcHe5ssbrjiM9HaJyH1vPsfa1DUwIjtRVJmA8+2M6hndCHHUFWqzAZlM42R\njiG8ocfrTkoWYEBPNgR9pIhlA1d7A8YXf4PF3wsL+lr8PkZjMyZ1qR6xeaSDAbrT\nUp/N96y2YN11rbY/BZIz\n-----END PRIVATE KEY-----\n",
    }),
    // Replace with your Firebase project config
    databaseURL: "https://doctor-fc359.firebaseio.com/",
  });
}

// Function to send notification
export const sendNotification = async (token, title, body) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
    };
    const response = await admin.messaging().send(message);
    console.log("Notification sent successfully:", response);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Updated assignDoctor function
export const getFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.userId;

    if (!fcmToken) {
      return res.status(400).json({ message: "FCM token is required." });
    }

    const user = await hospitalDoctors.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "FCM token stored successfully." });
  } catch (error) {
    console.error("Error storing FCM token:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
