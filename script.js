document.addEventListener("DOMContentLoaded", () => {
  /* ---------------- PAGE ELEMENTS ---------------- */

  const page0 = document.getElementById("page0");
  const page1 = document.getElementById("page1");
  const page2 = document.getElementById("page2");
  const page3 = document.getElementById("page3");
  const page4 = document.getElementById("page4");
  const page5 = document.getElementById("page5");

  const musicChoose = document.getElementById("musicChoose");
  const musicGame = document.getElementById("musicGame");
  const carClickSfx = document.getElementById("carClickSfx");

  /* SOUND EFFECTS */
  const youWinSound = document.getElementById("youWinSound");
  const gameOverSound = document.getElementById("gameOverSound");
  const clickSound = document.getElementById("clickSound");
  const winPointsSound = document.getElementById("winPointsSound");
  const losePointsSound = document.getElementById("losePointsSound");

  const lifeBar = document.getElementById("lifeBar");
  const gameArea = document.getElementById("gameArea");
  const scoreCounter = document.getElementById("scoreCounter");
  const finalScoreDisplay = document.getElementById("finalScoreDisplay");

  function showPage(page) {
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active"));
    page.classList.add("active");
  }

  /* Intro → Page 1 */
  setTimeout(() => showPage(page1), 3500);

  /* ---------------- GAME VARIABLES ---------------- */

  let life = 8;
  const maxLife = 8;
  let player = null;
  let fallingObjects = [];
  let score = 0;
  let gameOver = false;
  let winTimeout = null;

  /* ---------------- LIFE BAR ---------------- */

  function updateLifeBar() {
    life = Math.max(0, Math.min(8, life));

    lifeBar.style.display = "block";
    lifeBar.style.opacity = "1";

    if (life === 8) {
      lifeBar.src = "images/life-bar-full.png";
    } else if (life >= 1) {
      lifeBar.src = `images/life-bar-${life}.png`;
    }

    if (life === 0 && !gameOver) {
      lifeBar.src = "";
      gameOver = true;

      musicGame.pause();
      gameOverSound.currentTime = 0;
      gameOverSound.play().catch(() => {});

      showGameOver();
    }
  }

  /* ---------------- GAME OVER (PAGE 5 LOOP) ---------------- */

  function showGameOver() {
    showPage(page5);
    clearTimeout(winTimeout);

    setTimeout(() => {
      showPage(page0);
      setTimeout(() => showPage(page1), 3500);
    }, 3500);
  }

  /* ---------------- PLAY AGAIN BUTTON ---------------- */

  const playAgainBtn = document.getElementById("playAgainBtn");

  playAgainBtn.addEventListener("click", () => {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});

    musicGame.pause();
    musicChoose.currentTime = 0;

    showPage(page2);
    musicChoose.play().catch(() => {});
  });

  /* ---------------- START BUTTON ---------------- */

  const startBtn = document.getElementById("startBtn");
  startBtn.addEventListener("click", () => {
    showPage(page2);
    musicChoose.play().catch(() => {});
  });

  /* ---------------- ROAD GEOMETRY ---------------- */

  const TOP_Y = 15;
  const TOP_LEFT = 40;
  const TOP_RIGHT = 85;

  const BOT_Y = 100;
  const BOT_LEFT = 0;
  const BOT_RIGHT = 95;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function roadLeftAt(y) {
    return lerp(TOP_LEFT, BOT_LEFT, (y - TOP_Y) / (BOT_Y - TOP_Y));
  }

  function roadRightAt(y) {
    return lerp(TOP_RIGHT, BOT_RIGHT, (y - TOP_Y) / (BOT_Y - TOP_Y));
  }

  /* ---------------- OBJECT TYPES (surfboard bigger + less frequent) ---------------- */

  const objectTypes = [
    { type: "pineapple", img: "images/pineapple.png", life: 0, weight: 20 },
    { type: "ball", img: "images/ball.png", life: 0, weight: 15 },

    /* Surfboard very big + rare */
    { type: "surfboard", img: "images/surfboard.png", life: 0, weight: 6 },

    { type: "sun", img: "images/sun.png", life: +1, weight: 4 },

    { type: "debris", img: "images/debris.png", life: -1, weight: 26 },
    { type: "pothole", img: "images/pot-hole.png", life: -2, weight: 23 },
  ];

  function chooseRandomType() {
    const total = objectTypes.reduce((s, o) => s + o.weight, 0);
    let rand = Math.random() * total;

    for (let o of objectTypes) {
      if (rand < o.weight) return o;
      rand -= o.weight;
    }
    return objectTypes[0];
  }

  /* ---------------- PLAYER CAR — SUPER SMOOTH, FAST, RESPONSIVE ---------------- */

  class PlayerCar {
    constructor(el) {
      this.element = el;
      this.x = 50; // center
      this.speed = 0;
    }

    update(delta) {
      this.x += this.speed * delta;

      this.x = Math.max(BOT_LEFT, Math.min(BOT_RIGHT, this.x));
      this.element.style.left = this.x + "%";
    }
  }

  /* Smooth delta-time loop */
  let lastTime = 0;
  function movementLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = (timestamp - lastTime) / 16.67; // normalize to 60fps
    lastTime = timestamp;

    if (player && !gameOver) player.update(delta);

    requestAnimationFrame(movementLoop);
  }
  movementLoop();

  /* KEY INPUT — instant switching, fast speed */

  document.addEventListener("keydown", (e) => {
    if (!player || gameOver) return;

    player.speed = 0; // instant reset to avoid lag

    if (e.key === "ArrowLeft") {
      player.speed = -2.4;
    }

    if (e.key === "ArrowRight") {
      player.speed = 2.4;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (!player || gameOver) return;

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      player.speed = 0;
    }
  });

  /* ---------------- FALLING OBJECTS ---------------- */

  class FallingObject {
    constructor(el, data) {
      this.element = el;
      this.lifeEffect = data.life;
      this.type = data.type;
      this.reset();
    }

    reset() {
      this.y = TOP_Y;
      this.x = Math.random() * (TOP_RIGHT - TOP_LEFT) + TOP_LEFT;

      const targetX = Math.random() * (BOT_RIGHT - BOT_LEFT) + BOT_LEFT;
      this.driftX = ((targetX - this.x) / (BOT_Y - TOP_Y)) * 2.3;

      /* BIGGER SURFBOARD */
      if (this.type === "surfboard") {
        this.startScale = 0.1;
        this.endScale = 1.25;
      } else if (this.type === "pothole") {
        this.startScale = 0.15;
        this.endScale = 1.1;
      } else if (this.type === "debris") {
        this.startScale = 0.12;
        this.endScale = 0.9;
      } else if (this.type === "sun") {
        this.startScale = 0.09;
        this.endScale = 0.95;
      } else {
        this.startScale = 0.08;
        this.endScale = 0.85;
      }

      this.speed = 2.1;
      this.updatePosition();
    }

    updatePosition() {
      this.element.style.left = this.x + "%";
      this.element.style.top = this.y + "%";

      const t = (this.y - TOP_Y) / (BOT_Y - TOP_Y);
      const scale = this.startScale + (this.endScale - this.startScale) * t;

      this.element.style.transform = `translateX(-50%) scale(${scale})`;
    }

    fall() {
      this.y += this.speed;
      this.x += this.driftX;

      const L = roadLeftAt(this.y);
      const R = roadRightAt(this.y);
      this.x = Math.max(L, Math.min(R, this.x));

      if (this.y > 110) {
        this.destroy();
        return;
      }

      this.updatePosition();
    }

    destroy() {
      this.element.remove();
      fallingObjects = fallingObjects.filter((o) => o !== this);
    }
  }

  /* ---------------- SPAWN OBJECTS ---------------- */

  function spawnRandomObject() {
    const data = chooseRandomType();
    const el = document.createElement("img");
    el.src = data.img;

    el.classList.add("falling-object");
    if (data.type === "pothole") el.classList.add("pothole");
    if (data.type === "debris") el.classList.add("debris");

    gameArea.appendChild(el);

    const obj = new FallingObject(el, data);
    fallingObjects.push(obj);
  }

  setInterval(() => {
    if (!player || gameOver) return;
    spawnRandomObject();
  }, 900);

  /* ---------------- COLLISION DETECTION ---------------- */

  function detectCollision(obj, player) {
    const a = obj.element.getBoundingClientRect();
    const b = player.element.getBoundingClientRect();

    return !(
      a.bottom < b.top ||
      a.top > b.bottom ||
      a.right < b.left ||
      a.left > b.right
    );
  }

  /* ---------------- MAIN GAME LOOP ---------------- */

  setInterval(() => {
    if (!player || gameOver) return;

    for (let obj of [...fallingObjects]) {
      obj.fall();

      if (detectCollision(obj, player)) {
        if (obj.lifeEffect >= 0) {
          winPointsSound.currentTime = 0;
          winPointsSound.play().catch(() => {});
          score++;
          scoreCounter.textContent = "Score: " + score;
        }

        if (obj.lifeEffect < 0) {
          losePointsSound.currentTime = 0;
          losePointsSound.play().catch(() => {});
        }

        life += obj.lifeEffect;
        updateLifeBar();

        obj.destroy();
      }
    }
  }, 30);

  /* ---------------- CAR SELECTION + GAME RESET ---------------- */

  document.querySelectorAll(".car-option").forEach((car) => {
    car.addEventListener("click", () => {
      carClickSfx.currentTime = 0;
      carClickSfx.play().catch(() => {});

      const carImg = document.getElementById("playerCar");
      carImg.src = car.src;

      showPage(page3);

      musicChoose.pause();
      musicGame.currentTime = 0;
      musicGame.play().catch(() => {});

      player = new PlayerCar(carImg);
      gameOver = false;

      fallingObjects.forEach((o) => o.destroy());
      fallingObjects = [];

      /* FULL LIFE START */
      life = 8;

      lifeBar.style.display = "block";
      lifeBar.style.opacity = "1";
      lifeBar.src = "images/life-bar-full.png";

      setTimeout(() => updateLifeBar(), 30);

      /* RESET SCORE */
      score = 0;
      scoreCounter.textContent = "Score: 0";

      /* 1-MINUTE WIN TIMER */
      clearTimeout(winTimeout);
      winTimeout = setTimeout(() => {
        if (gameOver) return;

        gameOver = true;
        musicGame.pause();

        fallingObjects.forEach((o) => o.destroy());
        fallingObjects = [];

        youWinSound.currentTime = 0;
        youWinSound.play().catch(() => {});

        showPage(page4);
        finalScoreDisplay.textContent = "Final Score: " + score;
      }, 60000);
    });
  });
});
