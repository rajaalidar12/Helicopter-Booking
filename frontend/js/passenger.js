console.log("✅ passenger.js loaded");

/* =====================================================
   GLOBAL ELEMENTS (DECLARE ONCE ONLY)
   ===================================================== */
const bookingForm = document.getElementById("bookingForm");
const submitBtn = document.getElementById("submitBtn");
const availabilityBox = document.getElementById("availabilityBox");

/* =====================================================
   BOOK FLIGHT (OTP PROTECTED + FULL VALIDATION)
   ===================================================== */
bookingForm?.addEventListener("submit", async e => {
  e.preventDefault();

  const result = document.getElementById("result");

  /* ========= AUTH CHECK ========= */
  const token = localStorage.getItem("passengerToken");
  if (!token) {
    alert("Please login via OTP before booking");
    window.location.href = "login.html";
    return;
  }

  const formData = new FormData(bookingForm);

  /* ========= READ VALUES ========= */
  const name = formData.get("passengerName")?.trim();
  const age = Number(formData.get("age"));
  const phone = formData.get("phone")?.trim();
  const emergencyPhone = formData.get("emergencyPhone")?.trim();
  const email = formData.get("email")?.trim();
  const from = formData.get("from")?.trim();
  const to = formData.get("to")?.trim();
  const date = formData.get("date");
  const idType = formData.get("idType");
  const idNumber = formData.get("idNumber")?.trim();

  /* ========= REGEX ========= */
  const nameRegex = /^[A-Za-z ]{3,}$/;
  const phoneRegex = /^[0-9]{10}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ========= VALIDATIONS ========= */
  if (!nameRegex.test(name)) return showError("Name must be at least 3 letters");
  if (age < 1 || age > 120) return showError("Invalid age");
  if (!phoneRegex.test(phone)) return showError("Phone must be exactly 10 digits");
  if (!phoneRegex.test(emergencyPhone)) return showError("Emergency phone must be exactly 10 digits");
  if (email && !emailRegex.test(email)) return showError("Invalid email format");
  if (!from || !to) return showError("From & To required");
  if (from.toLowerCase() === to.toLowerCase()) return showError("From and To cannot be same");

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0,0,0,0);
  if (selectedDate < today) return showError("Date cannot be in the past");

  if (!idType || idNumber.length < 4) return showError("Valid ID required");

  /* ========= SUBMIT ========= */
  submitBtn.disabled = true;
  submitBtn.innerText = "Booking... ⏳";
  result.innerText = "";

  try {
    const res = await fetch("http://localhost:4000/book", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      result.innerText = "✅ Booking Successful! Ticket: " + data.ticketNumber;
      bookingForm.reset();
      resetAvailability();
    } else {
      showError(data.message || "Booking failed");
    }

  } catch (err) {
    console.error(err);
    showError("Server error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "✈️ Book Flight";
  }

  function showError(msg) {
    result.innerText = "❌ " + msg;
  }
});

/* =====================================================
   SEAT AVAILABILITY CHECK
   ===================================================== */
const dateInput = document.querySelector("input[name='date']");

dateInput?.addEventListener("change", async () => {
  const date = dateInput.value;
  if (!date) return;

  availabilityBox.style.display = "block";
  availabilityBox.className = "availability-box";
  availabilityBox.innerText = "Checking seat availability... ⏳";
  submitBtn.disabled = true;

  try {
    const res = await fetch(`http://localhost:4000/passenger/check-availability/${date}`);
    const data = await res.json();

    if (data.available) {
      availabilityBox.classList.add("availability-yes");
      availabilityBox.innerText = "✅ " + data.message;
      submitBtn.disabled = false;
    } else {
      availabilityBox.classList.add("availability-no");
      availabilityBox.innerText = "❌ " + data.message;
    }
  } catch {
    availabilityBox.classList.add("availability-no");
    availabilityBox.innerText = "❌ Unable to check availability";
  }
});

function resetAvailability() {
  availabilityBox.style.display = "none";
  availabilityBox.innerText = "";
}

/* =====================================================
   MANAGE BOOKING TOGGLE (FIXED)
   ===================================================== */
function toggleManageBooking() {
  console.log("🟢 toggleManageBooking clicked");

  const section = document.getElementById("manageBookingSection");
  if (!section) {
    alert("manageBookingSection not found in HTML");
    return;
  }

  section.style.display =
    section.style.display === "none" || section.style.display === ""
      ? "block"
      : "none";
}

/* =====================================================
   LOAD BOOKING
   ===================================================== */
async function loadBooking() {
  const ticket = document.getElementById("ticketNumber").value.trim();
  const bookingDetails = document.getElementById("bookingDetails");
  const downloadBtn = document.getElementById("downloadBtn");
  const modifySection = document.getElementById("modifySection");
  const cancelBtn = document.getElementById("cancelBtn");

  bookingDetails.innerHTML = "";
  downloadBtn.style.display = "none";
  modifySection.style.display = "none";
  cancelBtn.style.display = "none";

  const token = localStorage.getItem("passengerToken");
  if (!token) {
    alert("Please login first");
    return;
  }

  if (!ticket) {
    bookingDetails.innerHTML = "<p>❌ Enter ticket number</p>";
    return;
  }

  try {
    const res = await fetch(
      "http://localhost:4000/passenger/booking/" + ticket,
      { headers: { Authorization: "Bearer " + token } }
    );

    const booking = await res.json();

    if (!res.ok) {
      bookingDetails.innerHTML = "<p>❌ " + booking.message + "</p>";
      return;
    }

    bookingDetails.innerHTML = `
      <p><b>Name:</b> ${booking.passengerName}</p>
      <p><b>Date:</b> ${booking.date}</p>
      <p><b>Route:</b> ${booking.from} → ${booking.to}</p>
      <p><b>Status:</b> ${booking.status}</p>
    `;

    downloadBtn.style.display = "inline-block";
    downloadBtn.setAttribute("data-ticket", ticket);
    window.currentTicket = ticket;

    if (booking.status === "CONFIRMED") {
      modifySection.style.display = "block";
      cancelBtn.style.display = "inline-block";

      document.getElementById("newDate").value = booking.date;
      document.getElementById("newPhone").value = booking.phone || "";
      document.getElementById("newEmail").value = booking.email || "";
    }

  } catch {
    bookingDetails.innerHTML = "<p>❌ Server error</p>";
  }
}

/* =====================================================
   MODIFY BOOKING
   ===================================================== */
async function modifyBooking() {
  const token = localStorage.getItem("passengerToken");
  const ticket = window.currentTicket;
  if (!token || !ticket) return;

  const newDate = document.getElementById("newDate").value;
  const phone = document.getElementById("newPhone").value.trim();
  const email = document.getElementById("newEmail").value.trim();

  const res = await fetch(
    "http://localhost:4000/passenger/modify-booking/" + ticket,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ newDate, phone, email })
    }
  );

  const data = await res.json();
  alert(data.message || "Updated");
  loadBooking();
}

/* =====================================================
   CANCEL BOOKING
   ===================================================== */
async function cancelBooking() {
  if (!confirm("Cancel this booking?")) return;

  const token = localStorage.getItem("passengerToken");
  const ticket = window.currentTicket;
  if (!token || !ticket) return;

  const res = await fetch(
    "http://localhost:4000/passenger/cancel-booking/" + ticket,
    {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    }
  );

  const data = await res.json();
  alert(data.message || "Cancelled");

  document.getElementById("bookingDetails").innerHTML = "";
  document.getElementById("downloadBtn").style.display = "none";
  document.getElementById("modifySection").style.display = "none";
}

/* Downlaod Ticket  */

function downloadTicket() {
  const btn = document.getElementById("downloadBtn");
  const ticket = btn.getAttribute("data-ticket");
  const token = localStorage.getItem("passengerToken");

  if (!ticket || !token) {
    alert("Please login again");
    return;
  }

  window.open(
    `http://localhost:4000/passenger/download-ticket/${ticket}?token=${token}`,
    "_blank"
  );
}






/* =====================================================
   LOGOUT
   ===================================================== */
function passengerLogout() {
  localStorage.removeItem("passengerToken");
  window.location.href = "login.html";
}
