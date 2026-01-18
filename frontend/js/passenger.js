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
  const name = formData.get("passengerName").trim();
  const age = Number(formData.get("age"));
  const phone = formData.get("phone").trim();
  const emergencyPhone = formData.get("emergencyPhone").trim();
  const email = formData.get("email")?.trim();
  const from = formData.get("from").trim();
  const to = formData.get("to").trim();
  const date = formData.get("date");
  const idType = formData.get("idType");
  const idNumber = formData.get("idNumber").trim();

  /* ========= REGEX ========= */
  const nameRegex = /^[A-Za-z ]{3,}$/;
  const phoneRegex = /^[0-9]{10}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ========= VALIDATIONS ========= */

  if (!nameRegex.test(name)) {
    return showError("Name must be at least 3 letters (no numbers)");
  }

  if (age < 1 || age > 120) {
    return showError("Age must be between 1 and 120");
  }

  if (!phoneRegex.test(phone)) {
    return showError("Phone number must be exactly 10 digits");
  }

  if (!phoneRegex.test(emergencyPhone)) {
    return showError("Emergency phone must be exactly 10 digits");
  }

  if (email && !emailRegex.test(email)) {
    return showError("Invalid email format");
  }

  if (!from || !to) {
    return showError("From and To locations are required");
  }

  if (from.toLowerCase() === to.toLowerCase()) {
    return showError("From and To locations cannot be same");
  }

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return showError("Travel date cannot be in the past");
  }

  if (!idType || idNumber.length < 4) {
    return showError("Valid ID type and number required");
  }

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
      result.innerText =
        "✅ Booking Successful! Ticket Number: " + data.ticketNumber;
      form.reset();
    } else {
      showError(data.message || "Booking failed");
    }

  } catch (err) {
    console.error(err);
    showError("Server error. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "✈️ Book Flight";
  }

  /* ========= HELPER ========= */
  function showError(msg) {
    result.innerText = "❌ " + msg;
    submitBtn.disabled = false;
    submitBtn.innerText = "✈️ Book Flight";
  }
});

/* =====================================================
   LOGOUT
   ===================================================== */
function passengerLogout() {
  localStorage.removeItem("passengerToken");
  window.location.href = "login.html";
}
