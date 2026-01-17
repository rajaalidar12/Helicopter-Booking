/* ===============================
   BOOK FLIGHT
   =============================== */
document.getElementById("bookingForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    passengerName: passengerName.value.trim(),
    age: Number(age.value),
    phone: phone.value.trim(),
    email: email.value.trim(),
    from: from.value.trim(),
    to: to.value.trim(),
    date: date.value
  };

  // Basic validation
  if (!data.passengerName || data.age <= 0 || !data.phone || !data.email) {
    result.innerText = "❌ Please fill all fields correctly";
    return;
  }

  try {
    const res = await fetch("http://localhost:4000/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const response = await res.json();

    if (res.ok) {
      result.innerText =
        "✅ Booking Successful! Ticket: " + response.ticketNumber;
    } else {
      result.innerText = "❌ " + response.message;
    }
  } catch {
    result.innerText = "❌ Server error. Try again.";
  }
});

/* ===============================
   VIEW / CANCEL BOOKING
   =============================== */
async function loadBooking() {
  const ticket = ticketNumber.value.trim();
  if (!ticket) return;

  const res = await fetch(
    "http://localhost:4000/passenger/booking/" + ticket
  );
  const booking = await res.json();

  if (!res.ok) {
    bookingDetails.innerHTML = "<p>❌ Booking not found</p>";
    return;
  }

  bookingDetails.innerHTML = `
    <p><b>Name:</b> ${booking.passengerName}</p>
    <p><b>Date:</b> ${booking.date}</p>
    <p><b>Status:</b> ${booking.status}</p>
    <button onclick="cancelBooking('${ticket}')">Cancel Booking</button>
  `;
}

async function cancelBooking(ticket) {
  await fetch(
    "http://localhost:4000/passenger/cancel-booking/" + ticket,
    { method: "POST" }
  );

  bookingDetails.innerHTML = "<p>❌ Booking cancelled</p>";
}
