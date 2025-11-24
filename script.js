// -------------------------
// SELECT ALL SCREENS
// -------------------------
const page0 = document.getElementById("page0");
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const page3 = document.getElementById("page3");
const page4 = document.getElementById("page4");
const page5 = document.getElementById("page5");

// -------------------------
// HELPER FUNCTION TO SWITCH PAGES
// -------------------------
function showPage(page) {
  // Hide all screens
  page0.classList.remove("active");
  page1.classList.remove("active");
  page2.classList.remove("active");
  page3.classList.remove("active");
  page4.classList.remove("active");
  page5.classList.remove("active");

  // Show only the one we want
  page.classList.add("active");
}

// -------------------------
// PAGE 0 → PAGE 1 AFTER 3.5s
// -------------------------
setTimeout(() => {
  showPage(page1);
}, 3500);

// -------------------------
// CAR SELECTION
// -------------------------
let selectedCarImage = ""; // store the filename of the chosen car

const cars = document.querySelectorAll(".car-option");

cars.forEach((car) => {
  car.addEventListener("click", () => {
    selectedCarImage = car.src; // save the image path
    document.getElementById("chosenCar").src = selectedCarImage; // show on page2
    showPage(page2);
  });
});

// -------------------------
// START GAME BUTTON
// -------------------------
document.getElementById("startBtn").addEventListener("click", () => {
  // place the chosen car on the game page
  document.getElementById("playerCar").src = selectedCarImage;

  showPage(page3);
});
