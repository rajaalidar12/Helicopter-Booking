const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

module.exports = function generateTicketPDF(booking) {
  return new Promise((resolve, reject) => {
    const dir = path.join(__dirname, "../tickets");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const filePath = path.join(
      dir,
      `Ticket-${booking.ticketNumber}.pdf`
    );

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc
      .fontSize(22)
      .text("🚁 Kashmir Heli Services", { align: "center" })
      .moveDown();

    doc.fontSize(14).text(`Ticket Number: ${booking.ticketNumber}`);
    doc.text(`Passenger Name: ${booking.passengerName}`);
    doc.text(`Age: ${booking.age}`);
    doc.text(`Travel Date: ${booking.date}`);
    doc.text(`From: ${booking.from}`);
    doc.text(`To: ${booking.to}`);
    doc.text(`Phone: ${booking.phone}`);
    doc.text(`Email: ${booking.email}`);

    doc.moveDown();
    doc.text("Status: CONFIRMED", { underline: true });

    doc.moveDown();
    doc.fontSize(12).text(
      "Please carry a valid ID during travel.\n" +
      "Reporting time: 45 minutes before departure.\n\n" +
      "Thank you for choosing Kashmir Heli Services."
    );

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
};
