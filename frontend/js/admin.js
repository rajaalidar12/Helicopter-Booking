const API = "http://localhost:4000";

/* ================= ADMIN LOGIN ================= */
async function adminLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("loginMsg");

  const res = await fetch(API + "/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (res.ok && data.token) {
    localStorage.setItem("adminToken", data.token);
    window.location.href = "dashboard.html";
  } else {
    msg.innerText = data.message || "Login failed";
  }
}

/* ================= SET DAILY QUOTA ================= */
async function setQuota() {
  const token = localStorage.getItem("adminToken");

  const res = await fetch(API + "/admin/set-quota", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      date: quotaDate.value,
      sorties: Number(sorties.value),
      seatsPerSortie: Number(seats.value)
    })
  });

  const data = await res.json();
  alert(data.message);
}

/* ================= SET MONTHLY QUOTA ================= */
async function setMonthlyQuota() {
  const token = localStorage.getItem("adminToken");

  const res = await fetch(API + "/admin/set-monthly-quota", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      year: Number(quotaYear.value),
      month: Number(quotaMonth.value),
      sorties: Number(monthlySorties.value),
      seatsPerSortie: Number(monthlySeats.value)
    })
  });

  const data = await res.json();
  alert(data.message + " (" + data.daysUpdated + " days)");
}

/* ================= LOAD BOOKINGS ================= */
async function loadBookings() {
  const token = localStorage.getItem("adminToken");

  const res = await fetch(API + "/admin/bookings", {
    headers: { Authorization: token }
  });

  const bookings = await res.json();
  bookingTable.innerHTML = "";

  bookings.forEach(b => {
    bookingTable.innerHTML += `
      <tr>
        <td>${b.ticketNumber}</td>
        <td>${b.passengerName}</td>
        <td>${b.date}</td>
        <td>${b.status}</td>
        <td>
          ${
            b.status === "CONFIRMED"
              ? `<button onclick="cancelBooking('${b._id}')">Cancel</button>`
              : "-"
          }
        </td>
      </tr>`;
  });
}

/* ================= CANCEL BOOKING ================= */
async function cancelBooking(id) {
  const token = localStorage.getItem("adminToken");

  await fetch(API + "/admin/cancel-booking/" + id, {
    method: "POST",
    headers: { Authorization: token }
  });

  loadBookings();
}

/* ================= LOAD REPORTS ================= */
async function loadReports() {
  const token = localStorage.getItem("adminToken");

  const res = await fetch(API + "/admin/reports/summary", {
    headers: { Authorization: token }
  });

  const data = await res.json();

  document.getElementById("reportSummary").innerHTML = `
    <li>Total Bookings: ${data.totalBookings}</li>
    <li>Confirmed Bookings: ${data.confirmedBookings}</li>
    <li>Cancelled Bookings: ${data.cancelledBookings}</li>
    <li>Total Seats: ${data.totalSeats}</li>
    <li>Available Seats: ${data.availableSeats}</li>
  `;
}

/* ================= DATE REPORT ================= */
async function loadDateReport() {
  const token = localStorage.getItem("adminToken");
  const date = document.getElementById("reportDate").value;

  const res = await fetch(API + "/admin/reports/date/" + date, {
    headers: { Authorization: token }
  });

  const data = await res.json();
  document.getElementById("dateReport").innerText =
    JSON.stringify(data, null, 2);
}
