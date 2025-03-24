function setup() {
  let canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  canvas.style("position", "fixed");
  canvas.style("top", "0");
  canvas.style("left", "0");
  canvas.style("z-index", "-1");
  stroke(220, 220, 220);
  noFill();
}

function draw() {
  background(232, 232, 232);

  rotateY(-0.1);

  const spacing = 60;
  const extraMargin = 12;
  const cols = floor(width / spacing) + extraMargin;
  const rows = floor(height / spacing) + extraMargin;
  const startX = -((cols - 1) * spacing) / 2;
  const startY = -((rows - 1) * spacing) / 2;

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
        continue;
      }

      const x1 = startX + x * spacing;
      const y1 = startY + y * spacing;
      const z1 = sin(frameCount * 0.05 + (x + y) * 0.1) * 20;

     
      if (x < cols - 2) {
        const x2 = startX + (x + 1) * spacing;
        const y2 = y1;
        const z2 = sin(frameCount * 0.05 + (x + 1 + y) * 0.1) * 20;
        line(x1, y1, z1, x2, y2, z2);
      }

      
      if (y < rows - 2) {
        const x2 = x1;
        const y2 = startY + (y + 1) * spacing;
        const z2 = sin(frameCount * 0.05 + (x + y + 1) * 0.1) * 20;
        line(x1, y1, z1, x2, y2, z2);
      }
    }
  }
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
