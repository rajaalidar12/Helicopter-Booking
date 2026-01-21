/* =========================================
   KASHMIR HELI - ADMIN DASHBOARD LOGIC
   ========================================= */
const API_BASE = "http://localhost:4000/admin";

// 1. AUTH GUARD: Kick user out if no token is found
const token = localStorage.getItem("adminToken");
if (!token && !window.location.href.includes("login.html")) {
  alert("⚠️ Session expired. Please login.");
  window.location.href = "login.html";
}

/* =========================================
   HELPER: AUTH HEADERS
   ========================================= */
function getHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token // Using Bearer standard
  };
}

/* =========================================
   1. SET DAILY QUOTA
   ========================================= */
async function setQuota() {
  const date = document.getElementById("quotaDate").value;
  const sorties = document.getElementById("sorties").value;
  const seats = document.getElementById("seats").value;

  if (!date || !sorties || !seats) {
    alert("❌ Please fill in Date, Sorties, and Seats.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/set-quota`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        date: date,
        totalSorties: Number(sorties),
        seatsPerSortie: Number(seats)
      })
    });

    const data = await res.json();

    if (res.ok) {
      alert("✅ " + data.message);
      loadReports(); // Refresh stats immediately
    } else {
      alert("❌ Error: " + (data.message || "Failed to set quota"));
    }
  } catch (err) {
    console.error(err);
    alert("❌ Server connection failed");
  }
}

/* =========================================
   2. SET MONTHLY QUOTA
   ========================================= */
async function setMonthlyQuota() {
  const year = document.getElementById("quotaYear").value;
  const month = document.getElementById("quotaMonth").value;
  const sorties = document.getElementById("monthlySorties").value;
  const seats = document.getElementById("monthlySeats").value;

  if (!year || !month || !sorties || !seats) {
    alert("❌ Please fill all Monthly Quota fields.");
    return;
  }

  if (confirm(`⚠️ Overwrite quotas for ${month}/${year}?`)) {
    try {
      const res = await fetch(`${API_BASE}/set-monthly-quota`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          year: Number(year),
          month: Number(month),
          sorties: Number(sorties),       // backend expects 'sorties' or 'totalSorties'? Adjusted to match your snippet
          seatsPerSortie: Number(seats)
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ " + data.message);
        loadReports();
      } else {
        alert("❌ Error: " + (data.message || "Failed"));
      }
    } catch (err) {
      alert("❌ Server Error");
    }
  }
}

/* =========================================
   3. LOAD REPORTS (STATS)
   ========================================= */
async function loadReports() {
  try {
    // Note: Adjusted endpoint to match your previous JS snippet
    const res = await fetch(`${API_BASE}/reports/summary`, {
      headers: getHeaders()
    });
    
    const data = await res.json();
    const list = document.getElementById("reportSummary");
    
    if(res.ok) {
        list.innerHTML = `
          <li>📦 Total Bookings: <strong>${data.totalBookings || 0}</strong></li>
          <li>✅ Confirmed: <strong>${data.confirmedBookings || 0}</strong></li>
          <li>🚫 Cancelled: <strong>${data.cancelledBookings || 0}</strong></li>
          <li>💺 Total Seats: <strong>${data.totalSeats || 0}</strong></li>
          <li>🎫 Available: <strong>${data.availableSeats || 0}</strong></li>
        `;
    }
  } catch (err) {
    console.error("Load Stats Error:", err);
  }
}

/* =========================================
   4. LOAD DATE REPORT
   ========================================= */
async function loadDateReport() {
  const date = document.getElementById("reportDate").value;
  if (!date) {
    alert("Please select a date first");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/reports/date/${date}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    document.getElementById("dateReport").innerText = JSON.stringify(data, null, 2);
  } catch (err) {
    document.getElementById("dateReport").innerText = "❌ Failed to load data";
  }
}

/* =========================================
   5. LOAD ALL BOOKINGS (TABLE)
   ========================================= */
async function loadBookings() {
  const tableBody = document.getElementById("bookingTable");
  tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center">Loading...</td></tr>`;

  try {
    // Adjusted endpoint to '/bookings' based on your snippet
    const res = await fetch(`${API_BASE}/bookings`, {
      headers: getHeaders()
    });
    const bookings = await res.json();

    tableBody.innerHTML = "";

    if (!Array.isArray(bookings) || bookings.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center">No bookings found</td></tr>`;
      return;
    }

    bookings.forEach(b => {
      // Choose color based on status
      let statusColor = "#1e293b";
      if(b.status === "CONFIRMED") statusColor = "#10b981"; // Green
      if(b.status === "CANCELLED") statusColor = "#ef4444"; // Red

      tableBody.innerHTML += `
        <tr>
          <td>${b.ticketNumber}</td>
          <td>${b.passengerName}</td>
          <td>${b.date}</td>
          <td style="color:${statusColor}; font-weight:bold;">${b.status}</td>
          <td>
            ${b.status === "CONFIRMED" 
              ? `<button class="btn-cancel" onclick="cancelBooking('${b.ticketNumber}')" style="background:#ef4444; padding:6px 12px; border-radius:4px; font-size:0.8rem;">Cancel</button>` 
              : '-'}
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error(err);
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Failed to load data</td></tr>`;
  }
}

/* =========================================
   6. CANCEL BOOKING
   ========================================= */
async function cancelBooking(ticketNumber) {
  if (!confirm(`Are you sure you want to cancel Ticket ${ticketNumber}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/cancel-booking/${ticketNumber}`, {
      method: "POST", // Usually cancellation is a POST or PUT
      headers: getHeaders()
    });

    const data = await res.json();
    
    if (res.ok) {
      alert("✅ Booking Cancelled");
      loadBookings(); // Refresh table
      loadReports();  // Refresh stats
    } else {
      alert("❌ " + (data.message || "Cancellation failed"));
    }
  } catch (err) {
    alert("❌ Server Error");
  }
}

/* =========================================
   7. LOGOUT FUNCTION
   ========================================= */
function adminLogout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("adminToken");
    window.location.href = "login.html";
  }
}

// Initialize Dashboard
if(token) {
    loadReports();
    loadBookings();
}