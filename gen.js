import puppeteer from "puppeteer";
import mongoose from "mongoose";
import fs from "fs";
import PatientHistory from "./models/patientHistorySchema.js"; // Import the PatientHistory schema

// Function to generate the PDF with MongoDB data
export const generateBillPdf = async (patientId, admissionId) => {
  try {
    // Fetch patient data from the database based on patientId and admissionId
    // const patientData = await PatientHistory.findOne(
    //   { patientId, "history.admissionId": admissionId },
    //   { "history.$": 1 } // Get only the matching history entry
    // );
    const patientData = await PatientHistory.findOne(
      { patientId, "history.admissionId": admissionId },
      { "history.$": 1 }
    ).select("name contact history.admissionId"); // Limit the fields returned

    // If no patient data is found, log and return
    if (!patientData || patientData.history.length === 0) {
      console.log("No patient history found for the given IDs");
      return;
    }

    // Extract patient history details
    const history = patientData.history[0];
    const patientInfo = {
      name: patientData.name,
      age: 30, // Example age, replace with actual logic (e.g., from birthdate)
      gender: patientData.gender,
      contact: patientData.contact,
      address: "Sample Address", // Replace with actual patient address
      admissionDate: history.admissionDate,
      dischargeDate: history.dischargeDate,
      diagnosis: history.initialDiagnosis,
    };

    // Define the HTML content for the bill, dynamically inserting patient data
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Final Bill & Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .container { padding: 20px; }
          h2 { text-align: center; margin-bottom: 20px; text-decoration: underline; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          table, th, td { border: 1px solid black; }
          th, td { padding: 8px; text-align: left; }
          .summary { margin-top: 20px; text-align: right; }
          .footer { margin-top: 30px; text-align: center; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Final Bill & Receipt</h2>
          <p><b>IPD No:</b> IP/788/2024 &nbsp;&nbsp; <b>Bill Date:</b> ${new Date().toLocaleDateString()}</p>
          <p><b>Patient Name:</b> ${
            patientInfo.name
          } &nbsp;&nbsp; <b>Age & Gender:</b> ${patientInfo.age} | ${
      patientInfo.gender
    }</p>
          <p><b>Treating Doctor:</b> Dr. Shrikant Hande &nbsp;&nbsp; <b>Status:</b> Cashless | TATA AIG GIC</p>
          
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Service Name</th>
                <th>Date</th>
                <th>Rate</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A</td>
                <td>Bed Charges</td>
                <td>${history.admissionDate}</td>
                <td>3000</td>
                <td>1</td>
                <td>3000.00</td>
              </tr>
              <tr>
                <td>B</td>
                <td>Consultation Charges</td>
                <td>${history.admissionDate}</td>
                <td>1500</td>
                <td>1</td>
                <td>1500.00</td>
              </tr>
              <!-- Add more rows dynamically based on the patient history -->
            </tbody>
          </table>

          <div class="summary">
            <p><b>Total Final Bill Amount:</b> 41505.00</p>
            <p><b>Pending Amount:</b> 41505.00</p>
            <p><b>Paid Amount (In Words):</b> Forty-One Thousand Five Hundred Five Rupees Only</p>
          </div>

          <div class="footer">
            Thank You for Choosing Our Services!
          </div>
        </div>
      </body>
      </html>
    `;

    // Save HTML content to a file (optional for debugging)
    fs.writeFileSync("bill.html", htmlContent);

    // Launch Puppeteer and generate the PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "load" });
    await page.pdf({
      path: `bill_${patientInfo.name}.pdf`,
      format: "A4",
      printBackground: true,
    });
    await browser.close();

    console.log("PDF Generated Successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};

// Example usage: Call the function with the patient ID and admission ID
generateBillPdf("NIK879", "67561e2b9b7d790f300b13fb");
