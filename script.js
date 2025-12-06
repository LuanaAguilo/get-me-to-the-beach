window.onload = function () {
  //--- page elements ---
  let page0 = document.getElementById("page0");
  let page1 = document.getElementById("page1");
  let page2 = document.getElementById("page2");
  let page3 = document.getElementById("page3");
  let page4 = document.getElementById("page4");
  let page5 = document.getElementById("page5");

  let musicChoose = document.getElementById("musicChoose");
  let musicGame = document.getElementById("musicGame");
  let carClickSfx = document.getElementById("carClickSfx");

  let youWinSound = document.getElementById("youWinSound");
  let gameOverSound = document.getElementById("gameOverSound");
  let clickSound = document.getElementById("clickSound");
  let winPointsSound = document.getElementById("winPointsSound");
  let losePointsSound = document.getElementById("losePointsSound");

  let lifeBar = document.getElementById("lifeBar");
  let gameArea = document.getElementById("gameArea");
  let scoreCounter = document.getElementById("scoreCounter");

  let finalScoreDisplay = document.getElementById("finalScoreDisplay");
  let finalScoreLose = document.getElementById("finalScoreLose");

  let highScoreWin = document.getElementById("highScoreWin");
  let highScoreLose = document.getElementById("highScoreLose");

  let startButton = document.getElementById("startBtn");
  let playAgainButton = document.getElementById("playAgainBtn");
  let carOptions = document.querySelectorAll(".car-option");

  function showPage(page) {
    let screens = document.querySelectorAll(".screen");
    screens.forEach((s) => s.classList.remove("active"));
    page.classList.add("active");
  }

  showPage(page0);
  setTimeout(() => showPage(page1), 3500);

  //--- road geometry ---
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

  //--- object types ---
  let objectTypes = [
    { type: "pineapple", img: "images/pineapple.png", life: 0, weight: 20 },
    { type: "ball", img: "images/ball.png", life: 0, weight: 15 },
    { type: "surfboard", img: "images/surfboard.png", life: 0, weight: 6 },
    { type: "sun", img: "images/sun.png", life: 1, weight: 3 },
    { type: "debris", img: "images/debris.png", life: -1, weight: 26 },
    { type: "pothole", img: "images/pot-hole.png", life: -2, weight: 23 },
  ];

  //--- block sun for first 15 seconds ---
  let sunAllowed = false;
  setTimeout(() => (sunAllowed = true), 15000);

  function chooseRandomType() {
    let total = 0;
    objectTypes.forEach((o) => (total += o.weight));
    let rand = Math.random() * total;

    for (let i = 0; i < objectTypes.length; i++) {
      if (rand < objectTypes[i].weight) return objectTypes[i];
      rand -= objectTypes[i].weight;
    }
    return objectTypes[0];
  }

  //--- player class ---
  class PlayerCar {
    constructor(element) {
      this.element = element;
      this.x = 50;
      this.speed = 0;
    }

    update(delta) {
      this.x += this.speed * delta;
      this.x = Math.max(BOT_LEFT, Math.min(BOT_RIGHT, this.x));
      this.element.style.left = this.x + "%";
    }

    collidesWith(obj) {
      let o = obj.element.getBoundingClientRect();
      let p = this.element.getBoundingClientRect();

      let shrink = obj.lifeEffect < 0 ? 0.03 : 0;

      let oAdj = {
        top: o.top + o.height * shrink,
        bottom: o.bottom - o.height * shrink,
        left: o.left + o.width * shrink,
        right: o.right - o.width * shrink,
      };

      return !(
        oAdj.bottom < p.top ||
        oAdj.top > p.bottom ||
        oAdj.right < p.left ||
        oAdj.left > p.right
      );
    }
  }

  //--- falling objects ---
  class FallingObject {
    constructor(element, data) {
      this.element = element;
      this.type = data.type;
      this.lifeEffect = data.life;
      this.reset();
    }

    reset() {
      this.y = TOP_Y;
      this.x = Math.random() * (TOP_RIGHT - TOP_LEFT) + TOP_LEFT;

      let targetX = Math.random() * (BOT_RIGHT - BOT_LEFT) + BOT_LEFT;
      this.driftX = ((targetX - this.x) / (BOT_Y - TOP_Y)) * 2.3;

      if (this.type === "surfboard") {
        this.startScale = 0.1;
        this.endScale = 1.55;
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

      this.speed = baseFallSpeed;
      this.updatePosition();
    }

    updatePosition() {
      this.element.style.left = this.x + "%";
      this.element.style.top = this.y + "%";

      let t = (this.y - TOP_Y) / (BOT_Y - TOP_Y);
      let scale = this.startScale + (this.endScale - this.startScale) * t;
      this.element.style.transform = "translateX(-50%) scale(" + scale + ")";
    }

    fall() {
      this.y += this.speed;
      this.x += this.driftX;

      let l = roadLeftAt(this.y);
      let r = roadRightAt(this.y);
      this.x = Math.max(l, Math.min(r, this.x));

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

  //--- game state ---
  let life = 8;
  let player = null;
  let fallingObjects = [];
  let score = 0;
  let gameOver = false;
  let winTimeout = null;

  let baseFallSpeed = 2.1;
  let spawnInterval = 900;
  let difficultyBoosted = false;
  let spawnLoop = null;

  //--- life bar ---
  function updateLifeBar() {
    if (life > 8) life = 8;
    if (life < 0) life = 0;

    lifeBar.style.display = "block";

    if (life === 8) {
      lifeBar.src = "images/life-bar-full.png";
    } else if (life >= 1) {
      lifeBar.src = "images/life-bar-" + life + ".png";
    }

    if (life === 0 && !gameOver) {
      gameOver = true;
      musicGame.pause();
      gameOverSound.currentTime = 0;
      gameOverSound.play().catch(() => {});
      showGameOver();
    }
  }

  //--- game over ---
  function showGameOver() {
    showPage(page5);

    let high = localStorage.getItem("highscore") || 0;
    if (score > high) {
      high = score;
      localStorage.setItem("highscore", high);
    }

    highScoreLose.textContent = "High Score: " + high;
    finalScoreLose.textContent = "Final Score: " + score;

    clearTimeout(winTimeout);

    setTimeout(() => {
      showPage(page0);
      setTimeout(() => showPage(page1), 3500);
    }, 3500);
  }

  //--- win screen ---
  function showWinScreen() {
    gameOver = true;
    musicGame.pause();

    fallingObjects.forEach((o) => o.destroy());
    fallingObjects = [];

    youWinSound.play().catch(() => {});

    let high = localStorage.getItem("highscore") || 0;
    if (score > high) {
      high = score;
      localStorage.setItem("highscore", high);
    }

    highScoreWin.textContent = "High Score: " + high;
    finalScoreDisplay.textContent = "Final Score: " + score;

    showPage(page4);
  }

  //--- spawn objects ---
  function spawnRandomObject() {
    let data = chooseRandomType();

    if (!sunAllowed && data.type === "sun") return;

    let el = document.createElement("img");
    el.src = data.img;
    el.classList.add("falling-object");

    if (data.type === "pothole") el.classList.add("pothole");
    if (data.type === "debris") el.classList.add("debris");
    if (data.type === "surfboard") el.classList.add("surfboard");

    gameArea.appendChild(el);

    let obj = new FallingObject(el, data);
    fallingObjects.push(obj);
  }

  //--- sounds ---
  function playCollectSound() {
    let s = winPointsSound.cloneNode(true);
    s.play().catch(() => {});
  }

  function playLoseSound() {
    let s = losePointsSound.cloneNode(true);
    s.play().catch(() => {});
  }

  //--- main game loop ---
  setInterval(() => {
    if (!player || gameOver) return;

    let objs = fallingObjects.slice();

    objs.forEach((obj) => {
      obj.fall();

      if (player.collidesWith(obj)) {
        if (obj.lifeEffect >= 0) {
          playCollectSound();
          score++;
          scoreCounter.textContent = "Score: " + score;
        } else {
          playLoseSound();
        }

        life += obj.lifeEffect;
        updateLifeBar();

        obj.destroy();
      }
    });
  }, 30);

  //--- difficulty boost ---
  setTimeout(() => {
    if (gameOver) return;

    difficultyBoosted = true;
    baseFallSpeed = 2.4;

    clearInterval(spawnLoop);
    spawnLoop = setInterval(() => {
      if (!player || gameOver) return;
      spawnRandomObject();
    }, 800);
  }, 30000);

  //--- movement loop ---
  let lastTime = 0;

  function movementLoop(t) {
    if (!lastTime) lastTime = t;

    let delta = (t - lastTime) / 16.67;
    lastTime = t;

    if (player && !gameOver) {
      player.update(delta);
    }

    requestAnimationFrame(movementLoop);
  }

  requestAnimationFrame(movementLoop);

  //--- controls ---
  window.addEventListener("keydown", (event) => {
    if (!player || gameOver) return;

    if (event.code === "ArrowLeft") player.speed = -2.4;
    if (event.code === "ArrowRight") player.speed = 2.4;
  });

  window.addEventListener("keyup", (event) => {
    if (!player || gameOver) return;

    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      player.speed = 0;
    }
  });

  //--- start button ---
  startButton.addEventListener("click", () => {
    showPage(page2);
    musicChoose.play().catch(() => {});
  });

  //--- play again (win) ---
  playAgainButton.addEventListener("click", () => {
    clickSound.play().catch(() => {});
    musicGame.pause();
    musicChoose.currentTime = 0;

    showPage(page2);
    musicChoose.play().catch(() => {});
  });

  //--- select car ---
  carOptions.forEach((car) => {
    car.addEventListener("click", () => {
      carClickSfx.play().catch(() => {});

      let carImg = document.getElementById("playerCar");
      carImg.src = car.src;

      showPage(page3);

      musicChoose.pause();
      musicGame.currentTime = 0;
      musicGame.play().catch(() => {});

      player = new PlayerCar(carImg);
      gameOver = false;

      fallingObjects.forEach((o) => o.destroy());
      fallingObjects = [];

      life = 8;
      lifeBar.style.display = "block";
      lifeBar.src = "images/life-bar-full.png";

      setTimeout(() => updateLifeBar(), 30);

      score = 0;
      scoreCounter.textContent = "Score: 0";

      clearInterval(spawnLoop);
      spawnLoop = setInterval(() => {
        if (!player || gameOver) return;
        spawnRandomObject();
      }, spawnInterval);

      baseFallSpeed = 2.1;
      difficultyBoosted = false;

      clearTimeout(winTimeout);
      winTimeout = setTimeout(() => {
        if (gameOver) return;
        showWinScreen();
      }, 60000);
    });
  });
};
