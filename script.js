window.onload = function () {
  // Page elements
  var page0 = document.getElementById("page0");
  var page1 = document.getElementById("page1");
  var page2 = document.getElementById("page2");
  var page3 = document.getElementById("page3");
  var page4 = document.getElementById("page4");
  var page5 = document.getElementById("page5");

  var musicChoose = document.getElementById("musicChoose");
  var musicGame = document.getElementById("musicGame");
  var carClickSfx = document.getElementById("carClickSfx");

  var youWinSound = document.getElementById("youWinSound");
  var gameOverSound = document.getElementById("gameOverSound");
  var clickSound = document.getElementById("clickSound");
  var winPointsSound = document.getElementById("winPointsSound");
  var losePointsSound = document.getElementById("losePointsSound");

  var lifeBar = document.getElementById("lifeBar");
  var gameArea = document.getElementById("gameArea");
  var scoreCounter = document.getElementById("scoreCounter");
  var finalScoreDisplay = document.getElementById("finalScoreDisplay");

  var startButton = document.getElementById("startBtn");
  var playAgainButton = document.getElementById("playAgainBtn");
  var carOptions = document.querySelectorAll(".car-option");

  // Show pages
  function showPage(page) {
    var screens = document.querySelectorAll(".screen");
    screens.forEach(function (screen) {
      screen.classList.remove("active");
    });
    page.classList.add("active");
  }

  // Intro transition
  showPage(page0);
  setTimeout(function () {
    showPage(page1);
  }, 3500);

  // Road geometry
  var TOP_Y = 15;
  var TOP_LEFT = 40;
  var TOP_RIGHT = 85;

  var BOT_Y = 100;
  var BOT_LEFT = 0;
  var BOT_RIGHT = 95;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function roadLeftAt(y) {
    return lerp(TOP_LEFT, BOT_LEFT, (y - TOP_Y) / (BOT_Y - TOP_Y));
  }

  function roadRightAt(y) {
    return lerp(TOP_RIGHT, BOT_RIGHT, (y - TOP_Y) / (BOT_Y - TOP_Y));
  }

  // Object types
  var objectTypes = [
    { type: "pineapple", img: "images/pineapple.png", life: 0, weight: 20 },
    { type: "ball", img: "images/ball.png", life: 0, weight: 15 },
    { type: "surfboard", img: "images/surfboard.png", life: 0, weight: 6 },
    { type: "sun", img: "images/sun.png", life: 1, weight: 3 },
    { type: "debris", img: "images/debris.png", life: -1, weight: 26 },
    { type: "pothole", img: "images/pot-hole.png", life: -2, weight: 23 },
  ];

  // Block suns for first 15 sec
  var sunAllowed = false;

  setTimeout(function () {
    sunAllowed = true;
  }, 15000);

  function chooseRandomType() {
    var total = 0;
    objectTypes.forEach(function (o) {
      total += o.weight;
    });

    var rand = Math.random() * total;

    for (var i = 0; i < objectTypes.length; i++) {
      if (rand < objectTypes[i].weight) {
        return objectTypes[i];
      }
      rand -= objectTypes[i].weight;
    }

    return objectTypes[0];
  }

  // Player car
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
      var o = obj.element.getBoundingClientRect();
      var p = this.element.getBoundingClientRect();

      var shrink = obj.lifeEffect < 0 ? 0.03 : 0;

      var oAdj = {
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

  // Falling object
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

      var targetX = Math.random() * (BOT_RIGHT - BOT_LEFT) + BOT_LEFT;
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

      var t = (this.y - TOP_Y) / (BOT_Y - TOP_Y);
      var scale = this.startScale + (this.endScale - this.startScale) * t;

      this.element.style.transform = "translateX(-50%) scale(" + scale + ")";
    }

    fall() {
      this.y += this.speed;
      this.x += this.driftX;

      var l = roadLeftAt(this.y);
      var r = roadRightAt(this.y);

      this.x = Math.max(l, Math.min(r, this.x));

      if (this.y > 110) {
        this.destroy();
        return;
      }

      this.updatePosition();
    }

    destroy() {
      this.element.remove();
      fallingObjects = fallingObjects.filter(function (o) {
        return o !== this;
      }, this);
    }
  }

  // Game state
  var life = 8;
  var player = null;
  var fallingObjects = [];
  var score = 0;
  var gameOver = false;
  var winTimeout = null;

  var baseFallSpeed = 2.1;
  var spawnInterval = 900;
  var difficultyBoosted = false;
  var spawnLoop = null;

  // Life bar
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
      gameOverSound.play().catch(function () {});
      showGameOver();
    }
  }

  // Game over
  function showGameOver() {
    showPage(page5);
    clearTimeout(winTimeout);

    setTimeout(function () {
      showPage(page0);
      setTimeout(function () {
        showPage(page1);
      }, 3500);
    }, 3500);
  }

  // Win screen
  function showWinScreen() {
    gameOver = true;
    musicGame.pause();

    fallingObjects.forEach(function (o) {
      o.destroy();
    });

    fallingObjects = [];

    youWinSound.play().catch(function () {});

    showPage(page4);
    finalScoreDisplay.textContent = "Final Score: " + score;
  }

  // Spawn objects
  function spawnRandomObject() {
    var data = chooseRandomType();

    if (!sunAllowed && data.type === "sun") {
      return;
    }

    var el = document.createElement("img");
    el.src = data.img;
    el.classList.add("falling-object");

    if (data.type === "pothole") el.classList.add("pothole");
    if (data.type === "debris") el.classList.add("debris");
    if (data.type === "surfboard") el.classList.add("surfboard");

    gameArea.appendChild(el);

    var obj = new FallingObject(el, data);
    fallingObjects.push(obj);
  }

  // Sounds
  function playCollectSound() {
    var s = winPointsSound.cloneNode(true);
    s.play().catch(function () {});
  }

  function playLoseSound() {
    var s = losePointsSound.cloneNode(true);
    s.play().catch(function () {});
  }

  // Main loop
  setInterval(function () {
    if (!player || gameOver) return;

    var objs = fallingObjects.slice();

    objs.forEach(function (obj) {
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

  // Difficulty boost after 30 sec
  setTimeout(function () {
    if (gameOver) return;

    difficultyBoosted = true;
    baseFallSpeed = 2.4;

    clearInterval(spawnLoop);
    spawnLoop = setInterval(function () {
      if (!player || gameOver) return;
      spawnRandomObject();
    }, 800);
  }, 30000);

  // Player movement
  var lastTime = 0;

  function movementLoop(t) {
    if (!lastTime) lastTime = t;

    var delta = (t - lastTime) / 16.67;
    lastTime = t;

    if (player && !gameOver) {
      player.update(delta);
    }

    requestAnimationFrame(movementLoop);
  }

  requestAnimationFrame(movementLoop);

  // Controls
  window.addEventListener("keydown", function (event) {
    if (!player || gameOver) return;

    if (event.code === "ArrowLeft") {
      player.speed = -2.4;
    }
    if (event.code === "ArrowRight") {
      player.speed = 2.4;
    }
  });

  window.addEventListener("keyup", function (event) {
    if (!player || gameOver) return;

    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      player.speed = 0;
    }
  });

  // Buttons
  startButton.addEventListener("click", function () {
    showPage(page2);
    musicChoose.play().catch(function () {});
  });

  playAgainButton.addEventListener("click", function () {
    clickSound.play().catch(function () {});
    musicGame.pause();
    musicChoose.currentTime = 0;

    showPage(page2);
    musicChoose.play().catch(function () {});
  });

  // Car selection
  carOptions.forEach(function (car) {
    car.addEventListener("click", function () {
      carClickSfx.play().catch(function () {});

      var carImg = document.getElementById("playerCar");
      carImg.src = car.src;

      showPage(page3);

      musicChoose.pause();
      musicGame.currentTime = 0;
      musicGame.play().catch(function () {});

      player = new PlayerCar(carImg);
      gameOver = false;

      fallingObjects.forEach(function (o) {
        o.destroy();
      });

      fallingObjects = [];

      life = 8;
      lifeBar.style.display = "block";
      lifeBar.src = "images/life-bar-full.png";

      setTimeout(function () {
        updateLifeBar();
      }, 30);

      score = 0;
      scoreCounter.textContent = "Score: 0";

      clearInterval(spawnLoop);
      spawnLoop = setInterval(function () {
        if (!player || gameOver) return;
        spawnRandomObject();
      }, spawnInterval);

      baseFallSpeed = 2.1;
      difficultyBoosted = false;

      clearTimeout(winTimeout);
      winTimeout = setTimeout(function () {
        if (gameOver) return;
        showWinScreen();
      }, 60000);
    });
  });
};
