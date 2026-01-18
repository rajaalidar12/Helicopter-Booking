/* =====================================================
   BOOK FLIGHT (OTP PROTECTED + ANTI DOUBLE CLICK)
   ===================================================== */
document.getElementById("bookingForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const result = document.getElementById("result");
  const submitBtn = document.getElementById("submitBtn");

  /* 🔐 CHECK OTP TOKEN */
  const token = localStorage.getItem("passengerToken");
  if (!token) {
    alert("Please login via OTP before booking");
    window.location.href = "login.html";
    return;
  }

  const form = e.target;
  const formData = new FormData(form);

  /* BASIC VALIDATION */
  if (
    !formData.get("passengerName") ||
    !formData.get("age") ||
    !formData.get("phone") ||
    !formData.get("from") ||
    !formData.get("to") ||
    !formData.get("date") ||
    !formData.get("idType") ||
    !formData.get("idNumber")
  ) {
    result.innerText = "❌ Please fill all required fields";
    return;
  }

  /* 🔒 DISABLE BUTTON */
  submitBtn.disabled = true;
  submitBtn.innerText = "Booking... ⏳";
  result.innerText = "";

  try {
    const res = await fetch("http://localhost:4000/book", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      },
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      result.innerText =
        "✅ Booking Successful! Ticket Number: " + data.ticketNumber;

      form.reset();

      /* ✅ IMPORTANT: RE-ENABLE BUTTON */
      submitBtn.disabled = false;
      submitBtn.innerText = "✈️ Book Flight";

    } else {
      result.innerText = "❌ " + (data.message || "Booking failed");
      submitBtn.disabled = false;
      submitBtn.innerText = "✈️ Book Flight";
    }

  } catch (err) {
    console.error(err);
    result.innerText = "❌ Server error. Please try again.";
    submitBtn.disabled = false;
    submitBtn.innerText = "✈️ Book Flight";
  }
});


/* =====================================================
   VIEW BOOKING DETAILS + SHOW DOWNLOAD BUTTON
   ===================================================== */
async function loadBooking() {
  const ticketInput = document.getElementById("ticketNumber");
  const bookingDetails = document.getElementById("bookingDetails");
  const downloadBtn = document.getElementById("downloadBtn");

  const ticket = ticketInput.value.trim();

  bookingDetails.innerHTML = "";
  downloadBtn.style.display = "none";

  if (!ticket) {
    bookingDetails.innerHTML = "<p>❌ Enter ticket number</p>";
    return;
  }

  try {
    const res = await fetch(
      "http://localhost:4000/passenger/booking/" + ticket
    );

    const booking = await res.json();

    if (!res.ok) {
      bookingDetails.innerHTML = "<p>❌ Booking not found</p>";
      downloadBtn.style.display = "none";
      return;
    }

    bookingDetails.innerHTML = `
      <p><b>Name:</b> ${booking.passengerName}</p>
      <p><b>Date:</b> ${booking.date}</p>
      <p><b>From:</b> ${booking.from}</p>
      <p><b>To:</b> ${booking.to}</p>
      <p><b>Status:</b> ${booking.status}</p>
    `;

    /* ✅ SHOW DOWNLOAD BUTTON */
    downloadBtn.style.display = "inline-block";

  } catch (err) {
    bookingDetails.innerHTML = "<p>❌ Server error</p>";
    downloadBtn.style.display = "none";
  }
}


/* =====================================================
   DOWNLOAD TICKET PDF
   ===================================================== */
function downloadTicket() {
  const ticket = document.getElementById("ticketNumber").value.trim();

  if (!ticket) {
    alert("Enter ticket number first");
    return;
  }

  window.open(
    `http://localhost:4000/passenger/download-ticket/${ticket}`,
    "_blank"
  );
}


/* =====================================================
   PASSENGER LOGOUT
   ===================================================== */
function passengerLogout() {
  localStorage.removeItem("passengerToken");
  alert("Logged out successfully");
  window.location.href = "login.html";
}
