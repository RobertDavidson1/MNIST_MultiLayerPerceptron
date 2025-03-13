// Get the canvas element and its context
const canvas = document.getElementById("draw-canvas");
const ctx = canvas.getContext("2d");

// Set canvas dimensions
canvas.width = 504;
canvas.height = 504;

// Fill the canvas with a white background
ctx.fillStyle = "#fafafa";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Set up drawing styles
ctx.lineWidth = 40;
ctx.lineCap = "round";
ctx.strokeStyle = "#2c3e50";

let isDrawing = false;
let lastX = 0,
  lastY = 0;
let rollingAnimationInterval; // To track the rolling animation interval
const rollingIntervalTime = 50; // 50ms per step for rolling animation

// --- Start Continuous Rolling Animation ---
function startRollingAnimation() {
  const element = document.getElementById("predicted-digit");
  // If the element is empty, initialize it to 0
  if (!element.innerText) {
    element.innerText = "0";
  }
  // Begin cycling digits continuously
  rollingAnimationInterval = setInterval(() => {
    let currentDigit = parseInt(element.innerText) || 0;
    currentDigit = (currentDigit + 1) % 10;
    element.innerText = currentDigit;
  }, rollingIntervalTime);
}

// --- Stop the Rolling Animation ---
function stopRollingAnimation() {
  clearInterval(rollingAnimationInterval);
}

// --- Utility: Downscale Canvas to 28x28 and Convert to Array ---
function getDownscaledDigitArray() {
  const offCanvas = document.createElement("canvas");
  offCanvas.width = 28;
  offCanvas.height = 28;
  const offCtx = offCanvas.getContext("2d");

  // Fill offscreen canvas with white background
  offCtx.fillStyle = "white";
  offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

  // Draw the main canvas onto the offscreen canvas
  offCtx.drawImage(canvas, 0, 0, offCanvas.width, offCanvas.height);

  // Extract pixel data from the 28x28 image
  const imageData = offCtx.getImageData(
    0,
    0,
    offCanvas.width,
    offCanvas.height
  );
  const data = imageData.data;

  const digitArray = [];
  for (let i = 0; i < 28; i++) {
    const row = [];
    for (let j = 0; j < 28; j++) {
      const index = (i * 28 + j) * 4;
      // Use the red channel (canvas is grayscale) and invert for processing
      row.push(255 - data[index]);
    }
    digitArray.push(row);
  }
  return digitArray;
}

// --- Prediction Update Function ---
function updatePrediction() {
  const digitArray = getDownscaledDigitArray();

  fetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ digit: digitArray }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        console.error("Error:", data.error);
        return;
      }
      // Determine the predicted digit based on the highest prediction value
      const predictions = data.predictions;
      let predictedDigit = 0;
      let maxVal = -Infinity;
      for (let i = 0; i < predictions.length; i++) {
        if (predictions[i] > maxVal) {
          maxVal = predictions[i];
          predictedDigit = i;
        }
      }
      // Update the predicted digit display with the final prediction
      document.getElementById("predicted-digit").innerText = predictedDigit;
    })
    .catch((err) => console.error("Prediction error:", err));
}

// --- Canvas Drawing Events ---
canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
  // Start the rolling animation as soon as drawing begins
  startRollingAnimation();
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDrawing) return;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  [lastX, lastY] = [e.offsetX, e.offsetY];
});

canvas.addEventListener("mouseup", () => {
  if (!isDrawing) return;
  isDrawing = false;
  // Stop the rolling animation immediately upon drawing stop
  stopRollingAnimation();
  // Make the prediction call
  updatePrediction();
});

canvas.addEventListener("mouseout", () => {
  if (isDrawing) {
    isDrawing = false;
    stopRollingAnimation();
    updatePrediction();
  }
});

// --- Clear Button Functionality ---
document.getElementById("clear-button").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  document.getElementById("predicted-digit").innerText = "";
});
