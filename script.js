//---------- SELECT ALL SCREENS -----------------------
const page0 = document.getElementById("page0");
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const page3 = document.getElementById("page3");
const page4 = document.getElementById("page4");
const page5 = document.getElementById("page5");

//---------- AUDIO -----------------------
const musicChoose = document.getElementById("musicChoose");
const musicGame = document.getElementById("musicGame");
const carClickSfx = document.getElementById("carClickSfx");

//---------- PAGE SWITCH HELPER -----------------------
function showPage(page) {
  page0.classList.remove("active");
  page1.classList.remove("active");
  page2.classList.remove("active");
  page3.classList.remove("active");
  page4.classList.remove("active");
  page5.classList.remove("active");

  page.classList.add("active");
}

//---------- PAGE 0 → PAGE 1 AFTER 3.5s ----------------
setTimeout(() => {
  showPage(page1);
}, 3500);

//---------- PAGE 1 (Start Button) → PAGE 2 -------------
document.getElementById("startBtn").addEventListener("click", () => {
  showPage(page2);

  // play choose-vehicle music
  musicGame.pause();
  musicChoose.currentTime = 0;
  musicChoose.play().catch(() => {});
});

//---------- CAR SELECTION (PAGE 2) ---------------------
let selectedCarImage = "";

const cars = document.querySelectorAll(".car-option");

cars.forEach((car) => {
  car.addEventListener("click", () => {
    selectedCarImage = car.src; // save selected image path

    // play click sound
    carClickSfx.currentTime = 0;
    carClickSfx.play().catch(() => {});

    // place chosen car on game page
    document.getElementById("playerCar").src = selectedCarImage;

    // switch to game page
    showPage(page3);

    // switch music
    musicChoose.pause();
    musicGame.currentTime = 0;
    musicGame.play().catch(() => {});

    // initialize car player movement
    const playerCarElement = document.getElementById("playerCar");
    player = new PlayerCar(playerCarElement);
    player.updatePosition();
  });
});

//---------- PLAYER CAR CLASS --------------------------
class PlayerCar {
  constructor(element) {
    this.element = element;
    this.x = 50; // middle of the screen
    this.y = 90; // near bottom (if needed later)
    this.speed = 3;
  }

  moveLeft() {
    if (this.x > 5) {
      this.x -= this.speed;
      this.updatePosition();
    }
  }

  moveRight() {
    if (this.x < 95) {
      this.x += this.speed;
      this.updatePosition();
    }
  }

  updatePosition() {
    this.element.style.left = this.x + "%";
  }
}

let player = null;

//---------- KEYBOARD CONTROLS -------------------------
document.addEventListener("keydown", (event) => {
  if (!player) return;

  if (event.key === "ArrowLeft") {
    player.moveLeft();
  }
  if (event.key === "ArrowRight") {
    player.moveRight();
  }
});
