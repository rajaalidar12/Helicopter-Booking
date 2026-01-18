/* =====================================================
   BOOK FLIGHT (OTP PROTECTED + FULL VALIDATION)
   ===================================================== */
document.getElementById("bookingForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const result = document.getElementById("result");
  const submitBtn = document.getElementById("submitBtn");

  /* ========= AUTH CHECK ========= */
  const token = localStorage.getItem("passengerToken");
  if (!token) {
    alert("Please login via OTP before booking");
    window.location.href = "login.html";
    return;
  }

  const form = e.target;
  const formData = new FormData(form);

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
  if (!phoneRegex.test(phone)) return showError("Phone must be 10 digits");
  if (!phoneRegex.test(emergencyPhone)) return showError("Emergency phone must be 10 digits");
  if (email && !emailRegex.test(email)) return showError("Invalid email");
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
      headers: {
        Authorization: "Bearer " + token
      },
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      result.innerText = "✅ Booking Successful! Ticket: " + data.ticketNumber;
      form.reset();
      resetAvailability();
    } else {
      showError(data.message || "Booking failed");
    }

  } catch {
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
   SEAT AVAILABILITY CHECK (DATE SELECT)
   ===================================================== */
const dateInput = document.getElementById("travelDate");
const availabilityBox = document.getElementById("availabilityBox");
const submitBtn = document.getElementById("submitBtn");

dateInput?.addEventListener("change", async () => {
  const date = dateInput.value;
  if (!date) return;

  availabilityBox.style.display = "block";
  availabilityBox.className = "availability-box";
  availabilityBox.innerText = "Checking seat availability... ⏳";
  submitBtn.disabled = true;

  try {
    const res = await fetch(
      `http://localhost:4000/passenger/check-availability/${date}`
    );
    const data = await res.json();

    if (data.available) {
      availabilityBox.classList.add("availability-yes");
      availabilityBox.innerText = "✅ " + data.message;
      submitBtn.disabled = false;
    } else {
      availabilityBox.classList.add("availability-no");
      availabilityBox.innerText = "❌ " + data.message;
      submitBtn.disabled = true;
    }

  } catch {
    availabilityBox.classList.add("availability-no");
    availabilityBox.innerText = "❌ Unable to check availability";
    submitBtn.disabled = true;
  }
});

function resetAvailability() {
  if (availabilityBox) {
    availabilityBox.style.display = "none";
    availabilityBox.innerText = "";
  }
}

/* =====================================================
   MANAGE BOOKING (VIEW + DOWNLOAD + CANCEL)
   ===================================================== */
async function loadBooking() {
  const ticket = document.getElementById("ticketNumber").value.trim();
  const bookingDetails = document.getElementById("bookingDetails");
  const downloadBtn = document.getElementById("downloadBtn");

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

    if (booking.status === "CONFIRMED") {
      bookingDetails.innerHTML += `
        <button class="danger-btn"
          onclick="cancelBooking('${ticket}')">
          ❌ Cancel Booking
        </button>`;
    }

  } catch {
    bookingDetails.innerHTML = "<p>❌ Server error</p>";
  }
}

/* =====================================================
   DOWNLOAD TICKET PDF
   ===================================================== */
function downloadTicket() {
  const btn = document.getElementById("downloadBtn");
  const ticket = btn.getAttribute("data-ticket");
  if (!ticket) return;

  window.open(
    `http://localhost:4000/passenger/download-ticket/${ticket}`,
    "_blank"
  );
}

/* =====================================================
   CANCEL BOOKING
   ===================================================== */
async function cancelBooking(ticket) {
  if (!confirm("Cancel this booking?")) return;

  await fetch(
    "http://localhost:4000/passenger/cancel-booking/" + ticket,
    { method: "POST" }
  );

  alert("Booking cancelled");
  document.getElementById("bookingDetails").innerHTML = "";
  document.getElementById("downloadBtn").style.display = "none";
}

/* =====================================================
   LOGOUT
   ===================================================== */
function passengerLogout() {
  localStorage.removeItem("passengerToken");
  window.location.href = "login.html";
}
