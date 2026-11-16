const form = document.querySelector("#waitlist-form");
const choices = document.querySelector("#choice-group");
const email = document.querySelector("#email");
const button = document.querySelector("#join-button");
const buttonText = button.querySelector("span");
const error = document.querySelector("#form-error");
const confirmation = document.querySelector("#confirmation");
const confirmationTitle = document.querySelector("#confirmation-title");
const confirmationDetail = document.querySelector("#confirmation-detail");
const note = document.querySelector("#waitlist-note");
const productNames = { gps: "GPS", bluetooth: "Bluetooth" };
const voterStorageKey = "trailtag-voter-id";
const sourceStorageKey = "trailtag-source";
let sessionVoterId;

// Which link brought this visitor: add ?src=tiktok (or flyer, mooseboyle, ...) to the link you share.
function readSource() {
  let source = "";
  try {
    source = new URLSearchParams(window.location.search).get("src") || "";
  } catch {
    source = "";
  }
  source = source.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  try {
    if (source) sessionStorage.setItem(sourceStorageKey, source);
    else source = sessionStorage.getItem(sourceStorageKey) || "";
  } catch {
    // Storage unavailable: keep whatever the address gave us.
  }
  return source || "direct";
}
const source = readSource();

function getVoterId() {
  if (sessionVoterId) return sessionVoterId;
  const newVoterId = crypto.randomUUID();
  try {
    sessionVoterId = localStorage.getItem(voterStorageKey) || newVoterId;
    localStorage.setItem(voterStorageKey, sessionVoterId);
  } catch {
    sessionVoterId = newVoterId;
  }
  return sessionVoterId;
}

function updateForm() {
  const choice = form.elements.choice.value;
  const product = productNames[choice];
  email.hidden = !product;
  email.disabled = !product;
  email.required = Boolean(product);
  buttonText.textContent = product ? `Join ${product} waitlist` : "Submit my choice";
  note.textContent = choice === "neither"
    ? "You can submit this choice without sharing an email."
    : "No payment or commitment. We use your email for updates about the version you choose.";
  error.hidden = true;
}

choices.addEventListener("change", updateForm);
window.addEventListener("pageshow", updateForm);
updateForm();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  const choice = form.elements.choice.value;
  const product = productNames[choice];
  button.disabled = true;
  choices.disabled = true;
  email.disabled = true;
  buttonText.textContent = "Saving…";
  error.hidden = true;

  try {
    const payload = { choice, voterId: getVoterId(), source };
    if (product) payload.email = email.value;
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      error.textContent = result.error || "Please try again in a moment.";
      error.hidden = false;
      return;
    }
    form.reset();
    form.hidden = true;
    note.hidden = true;
    confirmationTitle.textContent = product ? `You’re on the ${product} waitlist.` : "Thanks for your feedback.";
    confirmationDetail.textContent = product
      ? "We’ve saved your email and your choice."
      : "We’ve recorded your choice.";
    confirmation.hidden = false;
    confirmation.focus();
  } catch {
    error.textContent = "We couldn’t save your choice. Please try again.";
    error.hidden = false;
  } finally {
    button.disabled = false;
    choices.disabled = false;
    email.disabled = !product;
    buttonText.textContent = product ? `Join ${product} waitlist` : "Submit my choice";
  }
});
