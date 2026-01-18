
console.log("✅ QR PDF generator loaded");

const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

module.exports = async function generateTicketPDF(booking) {
  return new Promise(async (resolve, reject) => {
    try {
      const ticketsDir = path.join(__dirname, "../tickets");
      if (!fs.existsSync(ticketsDir)) fs.mkdirSync(ticketsDir);

      const pdfPath = path.join(
        ticketsDir,
        `Ticket-${booking.ticketNumber}.pdf`
      );

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      /* ================= HEADER ================= */
      doc
        .fontSize(22)
        .text("🚁 Kashmir Heli Services", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(14)
        .text("Official Helicopter Boarding Pass", { align: "center" })
        .moveDown(2);

      /* ================= TICKET DETAILS ================= */
      doc.fontSize(12);

      doc.text(`Ticket Number: ${booking.ticketNumber}`);
      doc.text(`Passenger Name: ${booking.passengerName}`);
      doc.text(`Date of Travel: ${booking.date}`);
      doc.text(`Route: ${booking.from} → ${booking.to}`);
      doc.text(`Status: ${booking.status}`);
      doc.moveDown();

      /* ================= QR DATA ================= */
      const qrData = `
Ticket: ${booking.ticketNumber}
Name: ${booking.passengerName}
Date: ${booking.date}
Route: ${booking.from} → ${booking.to}
Verify: http://localhost:4000/passenger/booking/${booking.ticketNumber}
      `;

      const qrImage = await QRCode.toDataURL(qrData);

      /* ================= QR CODE ================= */
      doc
        .fontSize(14)
        .text("Scan QR Code for Ticket Verification", { align: "left" })
        .moveDown(0.5);

      doc.image(qrImage, {
        fit: [150, 150],
        align: "left"
      });

      /* ================= FOOTER ================= */
      doc.moveDown(3);
      doc
        .fontSize(10)
        .text(
          "This is a system-generated ticket. Please carry valid ID proof during travel.",
          { align: "center" }
        );

      doc.end();

      stream.on("finish", () => resolve(pdfPath));
    } catch (err) {
      reject(err);
    }
  });
};
