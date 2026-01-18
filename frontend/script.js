/*****************************************************************
 * KASHMIR HELI SERVICES – FRONTEND SCRIPT
 * Landing Page + Status + Destinations
 *****************************************************************/

/* =====================================================
   FLIGHT STATUS CHECK (INDEX PAGE)
   ===================================================== */
async function checkStatus() {
  const ticketInput = document.getElementById("statusTicket");
  const resultBox = document.getElementById("statusResult");
  const cancelBtn = document.getElementById("cancelBtn");

  if (!ticketInput || !resultBox) return;

  const ticketNumber = ticketInput.value.trim();

  if (!ticketNumber) {
    resultBox.innerHTML = "❌ Please enter a ticket number";
    cancelBtn.style.display = "none";
    return;
  }

  try {
    const res = await fetch(
      "http://localhost:4000/passenger/booking/" + ticketNumber
    );

    const data = await res.json();

    if (!res.ok) {
      resultBox.innerHTML = "❌ Booking not found";
      cancelBtn.style.display = "none";
      return;
    }

    resultBox.innerHTML = `
      <b>Passenger:</b> ${data.passengerName}<br>
      <b>Date:</b> ${data.date}<br>
      <b>Route:</b> ${data.from} → ${data.to}<br>
      <b>Status:</b> ${data.status}
    `;

    if (data.status === "CONFIRMED") {
      cancelBtn.style.display = "block";
      cancelBtn.setAttribute("data-ticket", ticketNumber);
    } else {
      cancelBtn.style.display = "none";
    }

  } catch (err) {
    console.error(err);
    resultBox.innerHTML = "❌ Server error while fetching booking";
    cancelBtn.style.display = "none";
  }
}

/* =====================================================
   CANCEL BOOKING (PASSENGER – INDEX PAGE)
   ===================================================== */
async function cancelBooking() {
  const cancelBtn = document.getElementById("cancelBtn");
  const ticket = cancelBtn.getAttribute("data-ticket");

  if (!ticket) return;

  if (!confirm("Are you sure you want to cancel this booking?")) return;

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

/* =====================================================
   DESTINATION DETAILS (MODAL)
   ===================================================== */
const destinations = {
  gulmarg: {
    title: "Gulmarg",
    description:
      "Gulmarg (Meadow of Flowers) is one of Asia’s most famous hill stations, known for skiing, snow sports, and the world’s highest cable car.",
    highlights: [
      "Gulmarg Gondola (Asia’s highest)",
      "International skiing destination",
      "Alpine meadows & pine forests",
      "Winter snow paradise"
    ]
  },
  sonamarg: {
    title: "Sonamarg",
    description:
      "Sonamarg (Meadow of Gold) is a breathtaking valley with glaciers, rivers, and alpine beauty, serving as a gateway to Ladakh.",
    highlights: [
      "Thajiwas Glacier",
      "Sindh River",
      "Gateway to Ladakh",
      "High-altitude trekking routes"
    ]
  },
  pahalgam: {
    title: "Pahalgam",
    description:
      "Pahalgam is a lush green valley on the banks of the Lidder River, famous for scenic views and Bollywood film locations.",
    highlights: [
      "Betaab Valley",
      "Aru Valley",
      "Horse riding & trekking",
      "River rafting"
    ]
  },
  dal: {
    title: "Dal Lake",
    description:
      "Dal Lake is the heart of Srinagar, globally known for shikara rides, houseboats, floating gardens, and scenic sunsets.",
    highlights: [
      "Shikara rides",
      "Houseboats",
      "Floating markets",
      "Golden sunset views"
    ]
  }
};

function openDestination(key) {
  const modal = document.getElementById("destinationModal");
  if (!modal || !destinations[key]) return;

  const dest = destinations[key];

  document.getElementById("destTitle").innerText = dest.title;
  document.getElementById("destDesc").innerText = dest.description;

  const list = document.getElementById("destList");
  list.innerHTML = "";

  dest.highlights.forEach(item => {
    const li = document.createElement("li");
    li.innerText = "✔ " + item;
    list.appendChild(li);
  });

  modal.style.display = "block";
}

function closeDestination() {
  const modal = document.getElementById("destinationModal");
  if (modal) modal.style.display = "none";
}

/* =====================================================
   NAVIGATION HELPERS
   ===================================================== */
function goPassenger() {
  window.location.href = "passenger/login.html";
}

function goManage() {
  window.location.href = "passenger/manage.html";
}

function goAdmin() {
  window.location.href = "admin/login.html";
}
