const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

module.exports = async function generateTicketPDF(booking) {
  const ticketsDir = path.join(__dirname, "../tickets");
  if (!fs.existsSync(ticketsDir)) {
    fs.mkdirSync(ticketsDir);
  }

  const pdfPath = path.join(
    ticketsDir,
    `Ticket-${booking.ticketNumber}.pdf`
  );

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(fs.createWriteStream(pdfPath));

  /* ================= CALCULATIONS ================= */
  const seatNumber = "SEAT-" + booking.ticketNumber.slice(-2);

  const flightDate = new Date(booking.date);
  const boardingTime = new Date(flightDate.getTime() - 30 * 60000);
  const boardingTimeStr = boardingTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  /* ================= HEADER ================= */
  doc.rect(0, 0, 595, 90).fill("#0A4D68");

  doc
    .fillColor("#fff")
    .fontSize(26)
    .font("Helvetica-Bold")
    .text("🚁 Kashmir Heli Services", 40, 30);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text("Official Helicopter Boarding Pass", 40, 62);

  doc.moveDown(3);

  /* ================= TITLE ================= */
  doc
    .fillColor("#000")
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("BOARDING PASS", { align: "center" });

  doc.moveDown(0.5);

  doc
    .fontSize(14)
    .fillColor("#088395")
    .text(`Ticket Number: ${booking.ticketNumber}`, {
      align: "center"
    });

  doc.moveDown(1.5);

  /* ================= DETAILS BOX ================= */
  const boxTop = doc.y;

  doc
    .roundedRect(40, boxTop, 515, 230, 10)
    .stroke("#cccccc");

  /* LEFT COLUMN */
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#000")
    .text("Passenger Details", 60, boxTop + 15);

  doc
    .font("Helvetica")
    .fontSize(11)
    .text(`Name: ${booking.passengerName}`, 60, boxTop + 45)
    .text(`Age: ${booking.age}`, 60, boxTop + 65)
    .text(`Phone: ${booking.phone}`, 60, boxTop + 85)
    .text(`Email: ${booking.email || "N/A"}`, 60, boxTop + 105)
    .text(`Seat Number: ${seatNumber}`, 60, boxTop + 125);

  /* RIGHT COLUMN */
  doc
    .font("Helvetica-Bold")
    .text("Flight Details", 320, boxTop + 15);

  doc
    .font("Helvetica")
    .text(`From: ${booking.from}`, 320, boxTop + 45)
    .text(`To: ${booking.to}`, 320, boxTop + 65)
    .text(`Date: ${booking.date}`, 320, boxTop + 85)
    .text(`Boarding Time: ${boardingTimeStr}`, 320, boxTop + 105)
    .text(`Status: ${booking.status}`, 320, boxTop + 125);

  doc.moveDown(9);

  /* ================= QR CODE ================= */
  const qrData = `
Ticket: ${booking.ticketNumber}
Name: ${booking.passengerName}
Seat: ${seatNumber}
Boarding: ${boardingTimeStr}
Route: ${booking.from} -> ${booking.to}
`;

  const qrImage = await QRCode.toDataURL(qrData);

  doc
    .roundedRect(200, doc.y, 200, 220, 10)
    .stroke("#088395");

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#088395")
    .text("Scan at Boarding Gate", 200, doc.y + 10, {
      width: 200,
      align: "center"
    });

  doc.image(qrImage, 225, doc.y + 40, {
    fit: [150, 150]
  });

  doc.moveDown(12);

  /* ================= FOOTER ================= */
  doc
    .fontSize(9)
    .fillColor("#555")
    .text(
      "Please report at helipad at least 30 minutes before boarding time.\n" +
      "Carry a valid photo ID for verification.\n" +
      "This is a system-generated ticket.",
      { align: "center" }
    );

  doc.end();

  return pdfPath;
};
