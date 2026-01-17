document.getElementById("bookingForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  try {
    const res = await fetch("http://localhost:4000/book", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById("result").innerHTML = `
        ✅ Booking Successful!<br>
        <b>Ticket Number:</b> ${data.ticketNumber}
      `;
      form.reset();
    } else {
      document.getElementById("result").innerText = "❌ " + data.message;
    }

  } catch (err) {
    document.getElementById("result").innerText =
      "❌ Server error. Please try again.";
  }
});
/* ===============================
   FLIGHT STATUS CHECK
   =============================== */
async function checkStatus() {
  const ticketInput = document.getElementById("statusTicket");
  const resultBox = document.getElementById("statusResult");

  const ticketNumber = ticketInput.value.trim();

  if (!ticketNumber) {
    resultBox.innerHTML = "❌ Please enter a ticket number";
    return;
  }

  try {
    const res = await fetch(
      "http://localhost:4000/passenger/booking/" + ticketNumber
    );

    const data = await res.json();

    if (!res.ok) {
      resultBox.innerHTML = "❌ Booking not found";
      return;
    }

   resultBox.innerHTML = `
  <b>Passenger:</b> ${data.passengerName}<br>
  <b>Date:</b> ${data.date}<br>
  <b>Route:</b> ${data.from} → ${data.to}<br>
  <b>Status:</b> ${data.status}
`;

const cancelBtn = document.getElementById("cancelBtn");

const modifySection = document.getElementById("modifySection");

if (data.status === "CONFIRMED") {
  cancelBtn.style.display = "block";
  cancelBtn.setAttribute("data-ticket", ticketNumber);

  modifySection.style.display = "block";
  modifySection.setAttribute("data-ticket", ticketNumber);

  document.getElementById("newDate").value = data.date;
  document.getElementById("newPhone").value = data.phone || "";
  document.getElementById("newEmail").value = data.email || "";

} else {
  cancelBtn.style.display = "none";
  modifySection.style.display = "none";
}


  } catch (err) {
    resultBox.innerHTML =
      "❌ Unable to fetch booking. Server error.";
  }
}

/* ===============================
   CANCEL BOOKING (PASSENGER)
   =============================== */
async function cancelBooking() {
  const cancelBtn = document.getElementById("cancelBtn");
  const ticket = cancelBtn.getAttribute("data-ticket");

  if (!ticket) return;

  if (!confirm("Are you sure you want to cancel this booking?")) {
    return;
  }

  try {
    const res = await fetch(
      "http://localhost:4000/passenger/cancel-booking/" + ticket,
      { method: "POST" }
    );

    const data = await res.json();

    if (res.ok) {
      document.getElementById("statusResult").innerHTML =
        "❌ Booking cancelled successfully";
      cancelBtn.style.display = "none";
    } else {
      alert(data.message || "Cancellation failed");
    }

  } catch (err) {
    alert("Server error while cancelling booking");
  }
}

/* ===============================
   MODIFY BOOKING (PASSENGER)
   =============================== */
async function modifyBooking() {
  const modifySection = document.getElementById("modifySection");
  const ticket = modifySection.getAttribute("data-ticket");

  const newDate = document.getElementById("newDate").value;
  const phone = document.getElementById("newPhone").value.trim();
  const email = document.getElementById("newEmail").value.trim();

  if (!newDate && !phone && !email) {
    alert("Nothing to update");
    return;
  }

  try {
    const res = await fetch(
      "http://localhost:4000/passenger/modify-booking/" + ticket,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newDate, phone, email })
      }
    );

    const data = await res.json();

    if (res.ok) {
      alert("✅ Booking updated successfully");
      checkStatus(); // refresh view
    } else {
      alert(data.message || "Update failed");
    }

  } catch (err) {
    alert("Server error while updating booking");
  }
}
