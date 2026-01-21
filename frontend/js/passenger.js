// ../js/passenger.js
console.log("✅ passenger.js loaded");

/* =========================
   ELEMENT REFERENCES
   ========================= */
const bookingForm = document.getElementById("bookingForm");
const submitBtn = document.getElementById("submitBtn");
const availabilityBox = document.getElementById("availabilityBox");
const dateInput = document.getElementById("travelDate");

const bookingDetailsBox = document.getElementById("bookingDetails");
const downloadBtn = document.getElementById("downloadBtn");
const actionButtons = document.getElementById("actionButtons"); // optional panel of buttons
const modifyBox = document.getElementById("modifyBox"); // optional modify UI box
const newDateInput = document.getElementById("newDate");
const newPhoneInput = document.getElementById("newPhone");
const newEmailInput = document.getElementById("newEmail");
const ticketInput = document.getElementById("ticketNumber");

let currentTicket = null;

/* =========================
   HELPERS / VALIDATION
   ========================= */
const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showResult(msg, isError = false) {
  const el = document.getElementById("result");
  if (!el) {
    if (isError) alert(msg);
    else console.log(msg);
    return;
  }
  el.innerText = (isError ? "❌ " : "✅ ") + msg;
}

function clearResult() {
  const el = document.getElementById("result");
  if (el) el.innerText = "";
}

/* =========================
   BOOK FLIGHT (FormData + JWT)
   ========================= */
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearResult();

    const token = localStorage.getItem("passengerToken");
    if (!token) {
      alert("Please login via OTP before booking");
      window.location.href = "login.html";
      return;
    }

    // Basic client-side validation (mirrors server expectations)
    const formData = new FormData(bookingForm);
    const passengerName = (formData.get("passengerName") || "").trim();
    const age = Number(formData.get("age"));
    const phone = (formData.get("phone") || "").trim();
    const emergencyPhone = (formData.get("emergencyPhone") || "").trim();
    const email = (formData.get("email") || "").trim();
    const from = (formData.get("from") || "").trim();
    const to = (formData.get("to") || "").trim();
    const date = formData.get("date");
    const idType = formData.get("idType");
    const idNumber = (formData.get("idNumber") || "").trim();

    if (!passengerName || passengerName.length < 3) return showResult("Name must be at least 3 letters", true);
    if (!Number.isFinite(age) || age < 1 || age > 120) return showResult("Invalid age", true);
    if (!phoneRegex.test(phone)) return showResult("Phone must be exactly 10 digits", true);
    if (!phoneRegex.test(emergencyPhone)) return showResult("Emergency phone must be exactly 10 digits", true);
    if (email && !emailRegex.test(email)) return showResult("Invalid email format", true);
    if (!from || !to) return showResult("From & To required", true);
    if (from.toLowerCase() === to.toLowerCase()) return showResult("From and To cannot be same", true);

    const selectedDate = new Date(date);
    const today = new Date(); today.setHours(0,0,0,0);
    if (isNaN(selectedDate.getTime()) || selectedDate < today) return showResult("Date cannot be in the past", true);

    if (!idType || idNumber.length < 4) return showResult("Valid ID required", true);

    // Disable submit
    submitBtn.disabled = true;
    submitBtn.innerText = "Booking... ⏳";

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
        showResult("Booking Successful! Ticket: " + data.ticketNumber);
        bookingForm.reset();
        resetAvailability();
      } else {
        showResult(data.message || "Booking failed", true);
      }
    } catch (err) {
      console.error("Booking error:", err);
      showResult("Server error while booking", true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "✈️ Book Flight";
    }
  });
}

/* =========================
   SEAT AVAILABILITY CHECK
   ========================= */
if (dateInput) {
  dateInput.addEventListener("change", async () => {
    if (!dateInput.value) return;
    availabilityBox.style.display = "block";
    availabilityBox.className = "availability-box";
    availabilityBox.innerText = "Checking seat availability... ⏳";
    submitBtn.disabled = true;

    try {
      const res = await fetch(`http://localhost:4000/passenger/check-availability/${dateInput.value}`);
      const data = await res.json();

      if (data && data.available) {
        availabilityBox.classList.remove("availability-no");
        availabilityBox.classList.add("availability-yes");
        availabilityBox.innerText = "✅ " + data.message;
        submitBtn.disabled = false;
      } else {
        availabilityBox.classList.remove("availability-yes");
        availabilityBox.classList.add("availability-no");
        availabilityBox.innerText = "❌ " + (data?.message || "No seats");
        submitBtn.disabled = true;
      }
    } catch (err) {
      console.error("Availability check failed", err);
      availabilityBox.classList.remove("availability-yes");
      availabilityBox.classList.add("availability-no");
      availabilityBox.innerText = "❌ Unable to check availability";
      submitBtn.disabled = true;
    }
  });
}

function resetAvailability() {
  if (availabilityBox) {
    availabilityBox.style.display = "none";
    availabilityBox.innerText = "";
    availabilityBox.className = "availability-box";
  }
}

/* =========================
   MANAGE BOOKING (JWT PROTECTED)
   - loadBooking, downloadTicket, showModify, submitModify, cancelBooking
   All exposed on window for HTML onclick handlers.
   ========================= */

window.loadBooking = async function () {
  clearResult();
  const token = localStorage.getItem("passengerToken");
  if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  const ticket = (ticketInput?.value || "").trim();
  if (!ticket) {
    bookingDetailsBox.innerHTML = "<p>❌ Enter ticket number</p>";
    if (actionButtons) actionButtons.style.display = "none";
    return;
  }

  // Clear UI
  bookingDetailsBox.innerHTML = "⏳ Loading booking...";
  if (actionButtons) actionButtons.style.display = "none";
  currentTicket = null;

  try {
    const res = await fetch(`http://localhost:4000/passenger/booking/${encodeURIComponent(ticket)}`, {
      headers: { Authorization: "Bearer " + token }
    });

    const data = await res.json();

    if (!res.ok) {
      bookingDetailsBox.innerHTML = "<p>❌ " + (data.message || "Not found") + "</p>";
      return;
    }

    // Show booking info
    bookingDetailsBox.innerHTML = `
      <p><b>Name:</b> ${data.passengerName}</p>
      <p><b>Date:</b> ${data.date}</p>
      <p><b>Route:</b> ${data.from} → ${data.to}</p>
      <p><b>Status:</b> ${data.status}</p>
    `;

    currentTicket = ticket;

    // Show actions
    if (actionButtons) actionButtons.style.display = "flex";
    if (downloadBtn) {
      downloadBtn.style.display = "inline-block";
      downloadBtn.setAttribute("data-ticket", ticket);
    }
    if (modifyBox) {
      modifyBox.style.display = "none";
      newDateInput && (newDateInput.value = data.date || "");
      newPhoneInput && (newPhoneInput.value = data.phone || "");
      newEmailInput && (newEmailInput.value = data.email || "");
    }
  } catch (err) {
    console.error("Load booking error:", err);
    bookingDetailsBox.innerHTML = "<p>❌ Server error</p>";
    if (actionButtons) actionButtons.style.display = "none";
  }
};

window.downloadTicket = async function () {
  const token = localStorage.getItem("passengerToken");
  if (!token) {
    alert("Please login again");
    return;
  }
  if (!currentTicket) {
    alert("No ticket selected");
    return;
  }

  try {
    // Fetch the PDF as protected resource
    const res = await fetch(`http://localhost:4000/passenger/download-ticket/${encodeURIComponent(currentTicket)}`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Download failed");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ticket-${currentTicket}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download error:", err);
    alert("Download failed");
  }
};

window.showModify = function () {
  if (!currentTicket) return alert("Load a booking first");
  if (!modifyBox) return alert("Modify UI not found");
  modifyBox.style.display = modifyBox.style.display === "block" ? "none" : "block";
};

window.submitModify = async function () {
  if (!currentTicket) return alert("Load a booking first");

  const token = localStorage.getItem("passengerToken");
  if (!token) return alert("Login required");

  const newDate = newDateInput?.value || "";
  const phone = (newPhoneInput?.value || "").trim();
  const email = (newEmailInput?.value || "").trim();

  // Validation
  if (phone && !phoneRegex.test(phone)) return alert("Phone must be 10 digits");
  if (email && !emailRegex.test(email)) return alert("Invalid email");

  try {
    const res = await fetch(`http://localhost:4000/passenger/modify-booking/${encodeURIComponent(currentTicket)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ newDate, phone, email })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Modify failed");
      return;
    }

    alert(data.message || "Modified");
    // Refresh view
    window.loadBooking();
    if (modifyBox) modifyBox.style.display = "none";
  } catch (err) {
    console.error("Modify error:", err);
    alert("Modify failed");
  }
};

window.cancelBooking = async function () {
  if (!currentTicket) return alert("Load a booking first");
  if (!confirm("Cancel this booking?")) return;

  const token = localStorage.getItem("passengerToken");
  if (!token) return alert("Login required");

  try {
    const res = await fetch(`http://localhost:4000/passenger/cancel-booking/${encodeURIComponent(currentTicket)}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Cancel failed");
      return;
    }

    alert(data.message || "Cancelled");
    // Remove UI
    bookingDetailsBox.innerHTML = "";
    if (actionButtons) actionButtons.style.display = "none";
    currentTicket = null;
  } catch (err) {
    console.error("Cancel error:", err);
    alert("Cancel failed");
  }
};

/* =========================
   UI: Toggle Manage Booking (used on book.html)
   ========================= */
window.toggleManageBooking = function () {
  const section = document.getElementById("manageBookingSection");
  if (!section) return;
  section.style.display = section.style.display === "block" ? "none" : "block";
};

/* =========================
   LOGOUT
   ========================= */
window.passengerLogout = function () {
  localStorage.removeItem("passengerToken");
  window.location.href = "login.html";
};
