import puppeteer from "puppeteer";

import axios from "axios";

const generatePdf = async () => {
  try {
    // Fetch patient history data from the external API
    const response = await axios.get(
      " http://localhost:3000/patientHistory/KUN603"
    );
    const data = response.data;
    console.log(data);
    if (!data || data.length === 0) {
      console.error("No patient data found");
      return;
    }

    const patient = data; // Assuming the API returns an array with patient data as the first item
    console.log(patient);
    // // Check if the patient data is valid
    // if (!patient || !patient.patientId) {
    //   console.error("Invalid patient data");
    //   return;
    // }

    // Prepare the HTML structure for the PDF
    const htmlContent = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Roboto', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f9f9f9;
              color: #333;
            }
            h1, h2 {
              text-align: center;
              color: #1a73e8;
              margin-bottom: 10px;
            }
            .header {
              text-align: center;
              padding: 10px;
              border-bottom: 2px solid #1a73e8;
              margin-bottom: 20px;
            }
            .section {
              margin: 20px 0;
              background: #fff;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
            .title {
              font-weight: bold;
              color: #555;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            table th, table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            table th {
              background-color: #1a73e8;
              color: #fff;
            }
            a {
              color: #1a73e8;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Patient History Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <h2>Patient Information</h2>
            <p><span class="title">Name:</span> ${patient.name}</p>
            <p><span class="title">Gender:</span> ${patient.gender}</p>
            <p><span class="title">Contact:</span> ${patient.contact}</p>
          </div>

          <div class="section">
            <h2>History</h2>
            ${patient.history
              .map(
                (entry) => `
                  <div>
                    <p><span class="title">Admission ID:</span> ${
                      entry.admissionId
                    }</p>
                    <p><span class="title">Admission Date:</span> ${new Date(
                      entry.admissionDate
                    ).toLocaleDateString()}</p>
                    <p><span class="title">Discharge Date:</span> ${new Date(
                      entry.dischargeDate
                    ).toLocaleDateString()}</p>
                    <p><span class="title">Reason for Admission:</span> ${
                      entry.reasonForAdmission
                    }</p>
                    <p><span class="title">Symptoms:</span> ${
                      entry.symptoms
                    }</p>
                    <p><span class="title">Initial Diagnosis:</span> ${
                      entry.initialDiagnosis
                    }</p>

                    <h3>Follow-ups</h3>
                    <table>
                      <tr>
                        <th>Date</th>
                        <th>Notes</th>
                        <th>Observations</th>
                        <th>Temperature (°C)</th>
                        <th>Pulse</th>
                        <th>Respiration Rate</th>
                        <th>Blood Pressure</th>
                        <th>Oxygen Saturation (%)</th>
                        <th>Blood Sugar Level</th>
                        <th>Other Vitals</th>
                        <th>IV Fluid</th>
                        <th>Other Details</th>
                      </tr>
                      ${entry.followUps
                        .map(
                          (followUp) => `
                        <tr>
                          <td>${new Date(
                            followUp.date
                          ).toLocaleDateString()}</td>
                          <td>${followUp.notes}</td>
                          <td>${followUp.observations}</td>
                          <td>${followUp.temperature}</td>
                          <td>${followUp.pulse}</td>
                          <td>${followUp.respirationRate}</td>
                          <td>${followUp.bloodPressure}</td>
                          <td>${followUp.oxygenSaturation}</td>
                          <td>${followUp.bloodSugarLevel}</td>
                          <td>${followUp.otherVitals}</td>
                          <td>${followUp.ivFluid}</td>
                          <td>
                            <strong>NG Feeding:</strong> ${
                              followUp.nasogastric || "N/A"
                            }<br>
                            <strong>Oral Feed:</strong> ${
                              followUp.rtFeedOral || "N/A"
                            }<br>
                            <strong>Total Intake:</strong> ${
                              followUp.totalIntake || "N/A"
                            }<br>
                            <strong>Urine:</strong> ${
                              followUp.urine || "N/A"
                            }<br>
                            <strong>Stool:</strong> ${
                              followUp.stool || "N/A"
                            }<br>
                            <strong>Ventilator Mode:</strong> ${
                              followUp.ventyMode || "N/A"
                            }<br>
                            <strong>PEEP:</strong> ${
                              followUp.peepCpap || "N/A"
                            }<br>
                            <strong>Other Output:</strong> ${
                              followUp.otherOutput || "N/A"
                            }
                          </td>
                        </tr>
                      `
                        )
                        .join("")}
                    </table>
                  </div>
                `
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    // Launch Puppeteer and create PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    await page.pdf({ path: "patient-report.pdf", format: "A4" });

    await browser.close();
    console.log("PDF generated successfully!");
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};

generatePdf();
