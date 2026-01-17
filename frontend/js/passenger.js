/* =====================================================
   BOOK FLIGHT (OTP PROTECTED + ANTI DOUBLE CLICK)
   ===================================================== */
document.getElementById("bookingForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const result = document.getElementById("result");
  const submitBtn = document.getElementById("submitBtn");

  // 🔐 Check OTP token
  const token = localStorage.getItem("passengerToken");
  if (!token) {
    alert("Please login via OTP before booking");
    window.location.href = "login.html";
    return;
  }

  const form = e.target;
  const formData = new FormData(form);

  /* ========= BASIC VALIDATION ========= */
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

  /* ========= DISABLE BUTTON (ANTI DOUBLE CLICK) ========= */
  submitBtn.disabled = true;
  submitBtn.innerText = "Booking... ⏳";
  result.innerText = "";

  try {
    const res = await fetch("http://localhost:4000/book", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token // ✅ REQUIRED BY BACKEND
      },
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      result.innerText =
        "✅ Booking Successful! Ticket Number: " + data.ticketNumber;
      form.reset();
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
   PASSENGER LOGOUT
   ===================================================== */
function passengerLogout() {
  localStorage.removeItem("passengerToken");
  alert("Logged out successfully");
  window.location.href = "login.html";
}
