// Checkbox UI
document.querySelectorAll(".sell-item").forEach(item => {
  const checkbox = item.querySelector("input[type='checkbox']");
  const icon = item.querySelector(".sell-check");

  item.addEventListener("click", () => {
    checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
      item.classList.add("selected");
      icon.textContent = "check_box";
    } else {
      item.classList.remove("selected");
      icon.textContent = "check_box_outline_blank";
    }
  });
});

// Submit handler
document.getElementById("sellSubmitBtn").addEventListener("click", (e) => {
  e.preventDefault();

  const required = ["sellPostcode", "sellName", "sellEmail"];
  let valid = true;

  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.classList.add("field-error");
      valid = false;
    } else {
      el.classList.remove("field-error");
    }
  });

  if (!valid) return;

  // Submit Netlify form
  document.getElementById("sellForm").submit();

  // Show success + WhatsApp
  document.getElementById("sellSuccess").style.display = "block";
  document.getElementById("sellWhatsApp").style.display = "block";

  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
});
