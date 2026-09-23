// ================================
// 1. CAMERA + AI
// ================================

let video;
let handPose;
let hands = [];


// ================================
// 2. MOVEMENT DATA
// ================================

let prevX;
let prevY;
// Smoothed movement speed
let smoothedSpeed = 0;

// Lower values create smoother but slower reactions
let speedSmoothing = 0.2;
// Speed that counts as fully active visually
let maxVisualSpeed = 50;

// ================================
// 3. TRAIL
// ================================

let trail = [];
// How long each trail point stays alive
let trailLifetime = 1000;


// ================================
// 4. SWING DETECTION
// ================================

let swingThreshold = 50;
let canSwing = true;


// ================================
// 5. IMPACT EFFECT
// ================================

let showImpact = false;

let impactX = 0;
let impactY = 0;

let impactSize = 0;


// ================================
// SETUP
// ================================

function setup() {

  createCanvas(windowWidth, windowHeight);

  // Open webcam
  video = createCapture(VIDEO);

  video.size(640, 480);

  // Hide original HTML video
  video.hide();


  handPose = ml5.handPose(
  {
    runtime: "mediapipe",
    modelType: "lite"
  },
  modelReady
);
}

function modelReady() {
  console.log("HandPose model ready");

  // Start detection only after the model is ready
  handPose.detectStart(video, gotHands);
}


// ================================
// DRAW
// ================================

function draw() {

  background(0);

  // Fill the entire canvas without stretching. The camera may be cropped
  // slightly at the edges so there are no letterboxed areas.
  let videoScale = max(width / 640, height / 480);

  let videoDrawWidth = 640 * videoScale;
  let videoDrawHeight = 480 * videoScale;

  let videoOffsetX = (width - videoDrawWidth) / 2;
  let videoOffsetY = (height - videoDrawHeight) / 2;

  // Draw the camera like a mirror
push();

translate(
  videoOffsetX + videoDrawWidth,
  videoOffsetY
);

scale(-1, 1);

image(
  video,
  0,
  0,
  videoDrawWidth,
  videoDrawHeight
);

pop();

// Dim the camera while keeping the light trail bright
push();
noStroke();
fill(8, 12, 28, 155);
rect(
  videoOffsetX,
  videoOffsetY,
  videoDrawWidth,
  videoDrawHeight
);
pop();

// Remove trail points that are too old
let currentTime = millis();

while (
  trail.length > 0 &&
  currentTime - trail[0].createdAt > trailLifetime
) {
  trail.shift();
}


// Draw a continuous fading trail
strokeCap(ROUND);

for (let i = 0; i < trail.length; i++) {
  let point = trail[i];
  let pointAge = currentTime - point.createdAt;

  let trailAlpha = map(
    pointAge,
    0,
    trailLifetime,
    255,
    0
  );

  trailAlpha = constrain(trailAlpha, 0, 255);

  let trailWeight = map(
    pointAge,
    0,
    trailLifetime,
    6,
    1
  );

  // A new trail begins as a single point
  if (i === 0 || point.isStart) {
    noStroke();
    fill(255, trailAlpha);
    circle(point.x, point.y, 8);
    continue;
  }

  let previousPoint = trail[i - 1];

  stroke(255, trailAlpha);
  strokeWeight(trailWeight);

  line(
    previousPoint.x,
    previousPoint.y,
    point.x,
    point.y
  );
}

  // ================================
  // IF A HAND IS DETECTED
  // ================================

  if (hands.length > 0) {

    let hand = hands[0];

    // Mirror the finger's horizontal position
let mirroredFingerX =
  640 - hand.index_finger_tip.x;

// Convert camera coordinates to canvas coordinates
let x =
  videoOffsetX +
  mirroredFingerX * videoScale;

let y =
  videoOffsetY +
  hand.index_finger_tip.y * videoScale;

    // Start speed at 0
    let speed = 0;


    // ================================
    // CALCULATE MOVEMENT
    // ================================

    if (prevX !== undefined) {

      let dx = x - prevX;
      let dy = y - prevY;

      speed = sqrt(
        dx * dx +
        dy * dy
      );


      // ================================
      // DETECT SWING
      // ================================

      if (
        speed > swingThreshold &&
        canSwing
      ) {

        console.log("SWING!");

        // Save where swing happened
        impactX = x;
        impactY = y;

        // Start impact animation
        impactSize = 20;
        showImpact = true;


        // Stop detecting another swing immediately
        canSwing = false;

        setTimeout(() => {
          canSwing = true;
        }, 500);
      }
    }

    // Smooth sudden changes in movement speed
smoothedSpeed = lerp(
  smoothedSpeed,
  speed,
  speedSmoothing
);


    // ================================
    // SAVE TRAIL POINT
    // ================================

 trail.push({
  x: x,
  y: y,
  createdAt: millis(),
 speed: smoothedSpeed,
  isStart: prevX === undefined
});




    // ================================
    // DRAW CURRENT FINGER
    // ================================

    let currentSize = map(
  smoothedSpeed,
  0,
  100,
  20,
  80
);

    currentSize = constrain(
      currentSize,
      20,
      80
    );

    noStroke();
    fill(255);

    circle(
      x,
      y,
      currentSize
    );


    // ================================
    // SAVE CURRENT POSITION
    // ================================

    prevX = x;
    prevY = y;

  }

  else {

    // If hand disappears,
    // reset previous position

    prevX = undefined;
    prevY = undefined;

  }


  // ================================
  // DRAW IMPACT EFFECT
  // ================================

  if (showImpact) {

    noFill();

    stroke(255);

    strokeWeight(3);

    circle(
      impactX,
      impactY,
      impactSize
    );


    // Expand circle
    impactSize += 8;


    // Stop animation
    if (impactSize > 200) {

      showImpact = false;

    }
  }
}


// ================================
// RECEIVE AI RESULTS
// ================================

function gotHands(results) {

  hands = results;

}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // Reset positions after the coordinate system changes
  prevX = undefined;
  prevY = undefined;
  smoothedSpeed = 0;
  trail = [];
}
