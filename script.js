const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const isMobile = window.matchMedia("(max-width: 768px)").matches;
const effectiveType = navigator.connection?.effectiveType || "4g";
const isSlowConnection = effectiveType === "2g" || effectiveType === "3g" || effectiveType === "4g";

const clamp = (number, min, max) => Math.min(Math.max(number, min), max);
const roundTo = (value, precision = 3) => parseFloat(value.toFixed(precision));
const mapRange = (value, fromMin, fromMax, toMin, toMax) => {
  return roundTo(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));
};

function initRevealAnimation() {
  const revealItems = document.querySelectorAll(".reveal");

  if (prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -60px 0px"
    }
  );

  revealItems.forEach((item, index) => {
    // Reduce animation stagger on mobile or slow connections
    const staggerDelay = (isMobile || isSlowConnection) ? Math.min(index * 15, 80) : Math.min(index * 35, 220);
    item.style.transitionDelay = `${staggerDelay}ms`;
    observer.observe(item);
  });
}

function initTiltCards() {
  if (prefersReducedMotion || !hasFinePointer) return;

  const tiltItems = document.querySelectorAll(".tilt-card");

  tiltItems.forEach((item) => {
    const image = item.querySelector("img");
    const maxRotation = item.classList.contains("hero-panel") ? 8 : 13;
    let rect = null;
    let frame = null;
    let lastEvent = null;

    const updateTilt = () => {
      if (!rect || !lastEvent) return;

      const x = lastEvent.clientX - rect.left;
      const y = lastEvent.clientY - rect.top;
      const percentX = clamp(x / rect.width, 0, 1);
      const percentY = clamp(y / rect.height, 0, 1);
      const rotateY = (percentX - 0.5) * maxRotation * 2;
      const rotateX = (0.5 - percentY) * maxRotation * 2;

      item.classList.add("is-tilting");
      item.style.setProperty("--shine-x", `${percentX * 100}%`);
      item.style.setProperty("--shine-y", `${percentY * 100}%`);
      item.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;

      if (image) {
        const moveX = (percentX - 0.5) * -18;
        const moveY = (percentY - 0.5) * -18;
        image.style.transform = `translate3d(${moveX}px, ${moveY}px, 42px) scale(1.12)`;
      }
    };

    item.addEventListener("pointerenter", () => {
      rect = item.getBoundingClientRect();
    });

    item.addEventListener("pointermove", (event) => {
      lastEvent = event;

      if (frame) return;

      frame = requestAnimationFrame(() => {
        updateTilt();
        frame = null;
      });
    });

    item.addEventListener("pointerleave", () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = null;
      }

      item.classList.remove("is-tilting");
      item.style.transform = "";
      rect = null;
      lastEvent = null;

      if (image) {
        image.style.transform = "";
      }
    });
  });
}

function initHeroLight() {
  const hero = document.querySelector(".hero-section");
  const cursorLight = document.querySelector(".cursor-light");

  if (!hero || !cursorLight || prefersReducedMotion || !hasFinePointer) return;

  let frame = null;
  let lastEvent = null;
  let heroRect = hero.getBoundingClientRect();

  window.addEventListener("resize", () => {
    heroRect = hero.getBoundingClientRect();
  });

  window.addEventListener("pointermove", (event) => {
    lastEvent = event;

    if (frame) return;

    frame = requestAnimationFrame(() => {
      if (!lastEvent) return;

    cursorLight.classList.add("is-visible");
      cursorLight.style.transform = `translate3d(${lastEvent.clientX - 190}px, ${lastEvent.clientY - 190}px, 0)`;

      const x = clamp(((lastEvent.clientX - heroRect.left) / heroRect.width) * 100, 0, 100);
      const y = clamp(((lastEvent.clientY - heroRect.top) / heroRect.height) * 100, 0, 100);

    hero.style.setProperty("--hero-x", `${x}%`);
    hero.style.setProperty("--hero-y", `${y}%`);
      frame = null;
    });
  });

  document.addEventListener("pointerleave", () => {
    cursorLight.classList.remove("is-visible");
  });
}

function initProjectRing() {
  const ring = document.querySelector("#projectRing");
  const dragger = document.querySelector("#projectRingDragger");
  const cards = document.querySelectorAll(".project-ring-card");

  if (!ring || !dragger || !cards.length || typeof gsap === "undefined" || typeof Draggable === "undefined") {
    return;
  }

  let xPos = 0;
  const cardCount = cards.length;
  const angle = 360 / cardCount;
  const radius = hasFinePointer ? 700 : 480;
  const ringState = { rotationY: 180 };

  const getBgPos = (index) => {
    const wrapped = gsap.utils.wrap(0, 360, ringState.rotationY - 180 - index * angle);
    return `${(-wrapped / 360) * 420}px center`;
  };

  const updateRing = () => {
    gsap.set(ring, { rotationY: ringState.rotationY });
    gsap.set(cards, {
      backgroundPosition: (index) => getBgPos(index)
    });
  };

  gsap.timeline()
    .set(dragger, { opacity: 0 })
    .set(ring, { rotationY: 180 })
    .set(cards, {
      rotateY: (index) => index * -angle,
      transformOrigin: `50% 50% ${radius}px`,
      z: -radius,
      backgroundImage: (index, card) => `url(${card.dataset.image})`,
      backgroundPosition: (index) => getBgPos(index),
      backfaceVisibility: "hidden"
    })
    .from(cards, {
      duration: 1.3,
      y: 120,
      opacity: 0,
      stagger: 0.08,
      ease: "expo.out"
    });

  const rotationTween = gsap.quickTo(ringState, "rotationY", {
    duration: 0.18,
    ease: "power2.out",
    onUpdate: updateRing
  });

  Draggable.create(dragger, {
    type: "x",
    trigger: dragger,
    inertia: false,

    onDragStart(event) {
      const pointer = event.touches ? event.touches[0] : event;
      xPos = Math.round(pointer.clientX);
    },

    onDrag(event) {
      const pointer = event.touches ? event.touches[0] : event;
      const clientX = Math.round(pointer.clientX);
      const nextRotation = ringState.rotationY - ((clientX - xPos) % 360);

      rotationTween(nextRotation);

      xPos = clientX;
    },

    onDragEnd() {
      gsap.set(dragger, { x: 0, y: 0 });
    }
  });
}

function initHoloContactCard() {
  const wrapper = document.querySelector(".holo-card-wrapper");
  const card = document.querySelector(".holo-card");

  if (!wrapper || !card || prefersReducedMotion) return;

  let resetAnimation = null;
  let rect = null;
  let frame = null;
  let lastEvent = null;

  const setCardPosition = (x, y) => {
    if (!rect) {
      rect = card.getBoundingClientRect();
    }

    const px = clamp((100 / rect.width) * x, 0, 100);
    const py = clamp((100 / rect.height) * y, 0, 100);
    const cx = px - 50;
    const cy = py - 50;
    const fromCenter = clamp(Math.sqrt((py - 50) ** 2 + (px - 50) ** 2) / 50, 0, 1);

    wrapper.style.setProperty("--pointer-x", `${px}%`);
    wrapper.style.setProperty("--pointer-y", `${py}%`);
    wrapper.style.setProperty("--background-x", `${mapRange(px, 0, 100, 35, 65)}%`);
    wrapper.style.setProperty("--background-y", `${mapRange(py, 0, 100, 35, 65)}%`);
    wrapper.style.setProperty("--pointer-from-center", fromCenter);
    wrapper.style.setProperty("--pointer-from-top", py / 100);
    wrapper.style.setProperty("--pointer-from-left", px / 100);
    wrapper.style.setProperty("--rotate-x", `${roundTo(-(cx / 5))}deg`);
    wrapper.style.setProperty("--rotate-y", `${roundTo(cy / 4)}deg`);
  };

  const updateFromEvent = (event) => {
    setCardPosition(event.clientX - rect.left, event.clientY - rect.top);
  };

  card.addEventListener("pointerenter", () => {
    rect = card.getBoundingClientRect();
    wrapper.classList.add("active");
    card.classList.add("active");

    if (resetAnimation) {
      resetAnimation.cancel();
      resetAnimation = null;
    }
  });

  card.addEventListener("pointermove", (event) => {
    lastEvent = event;

    if (frame) return;

    frame = requestAnimationFrame(() => {
      updateFromEvent(lastEvent);
      frame = null;
    });
  });

  card.addEventListener("pointerleave", (event) => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }

    if (!rect) {
      rect = card.getBoundingClientRect();
    }

    const startX = event.clientX - rect.left;
    const startY = event.clientY - rect.top;
    const endX = rect.width / 2;
    const endY = rect.height / 2;
    const startTime = performance.now();
    const duration = 700;

    const animateBack = (time) => {
      const progress = clamp((time - startTime) / duration, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      const x = mapRange(eased, 0, 1, startX, endX);
      const y = mapRange(eased, 0, 1, startY, endY);

      setCardPosition(x, y);

      if (progress < 1) {
        const frame = requestAnimationFrame(animateBack);
        resetAnimation = { cancel: () => cancelAnimationFrame(frame) };
      } else {
        wrapper.classList.remove("active");
        card.classList.remove("active");
        resetAnimation = null;
        rect = null;
      }
    };

    requestAnimationFrame(animateBack);
  });

  rect = card.getBoundingClientRect();
  setCardPosition(rect.width - 70, 60);
}

function createGlobalMusicPlayer() {
  const player = document.createElement("aside");

  player.className = "global-music-player";
  player.setAttribute("data-local-music-player", "");
  player.setAttribute("aria-label", "Music player");
  player.innerHTML = `
    <div>
      <strong>Rodeo Remix</strong>
      <span data-music-status>Ready to play</span>
    </div>
    <button class="portfolio-icon-button" type="button" data-music-backward aria-label="Backward five seconds">
      <img src="https://snowleo208.github.io/100-Days-of-Code/7.%20Music%20Player/img/backward.svg" alt="">
    </button>
    <button class="portfolio-play-button" type="button" data-music-toggle aria-label="Play music">
      <img src="https://snowleo208.github.io/100-Days-of-Code/7.%20Music%20Player/img/play.svg" alt="">
    </button>
    <button class="portfolio-icon-button" type="button" data-music-forward aria-label="Forward five seconds">
      <img src="https://snowleo208.github.io/100-Days-of-Code/7.%20Music%20Player/img/forward.svg" alt="">
    </button>
    <button class="portfolio-icon-button is-active" type="button" data-music-loop aria-label="Loop music">
      <img src="https://snowleo208.github.io/100-Days-of-Code/7.%20Music%20Player/img/loop.svg" alt="">
    </button>
    <span class="global-music-time" data-music-current>00:00</span>
    <button class="global-music-progress" type="button" data-music-progress aria-label="Seek music">
      <span data-music-progress-length></span>
    </button>
    <span class="global-music-time" data-music-duration>00:00</span>
    <audio data-local-music src="rodeo-remix.mp3" preload="metadata"></audio>
  `;

  document.body.appendChild(player);
  return player;
}

function initLocalMusicPlayer() {
  const player = document.querySelector("[data-local-music-player]") || createGlobalMusicPlayer();

  if (!player) return;

  const audio = player.querySelector("[data-local-music]");
  const playButton = player.querySelector("[data-music-toggle]");
  const playIcon = playButton?.querySelector("img");
  const backwardButton = player.querySelector("[data-music-backward]");
  const forwardButtons = player.querySelectorAll("[data-music-forward]");
  const loopButton = player.querySelector("[data-music-loop]");
  const progressButton = player.querySelector("[data-music-progress]");
  const progressLength = player.querySelector("[data-music-progress-length]");
  const currentTimeText = player.querySelector("[data-music-current]");
  const durationText = player.querySelector("[data-music-duration]");
  const statusText = player.querySelector("[data-music-status]");

  if (!audio || !playButton || !playIcon || !progressButton || !progressLength) return;

  const storageKey = "portfolioMusicState";
  const playSrc = "https://snowleo208.github.io/100-Days-of-Code/7.%20Music%20Player/img/play.svg";
  const pauseSrc = "https://snowleo208.github.io/100-Days-of-Code/7.%20Music%20Player/img/pause.svg";
  const savedState = JSON.parse(localStorage.getItem(storageKey) || "{}");
  let hasTriedResume = false;

  audio.loop = true;
  audio.volume = 0.85;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const updatePlayState = () => {
    const isPlaying = !audio.paused;

    playIcon.src = isPlaying ? pauseSrc : playSrc;
    playIcon.alt = isPlaying ? "Pause" : "Play";
    playButton.setAttribute("aria-label", isPlaying ? "Pause music" : "Play music");
  };

  const updateProgress = () => {
    const duration = audio.duration || 0;
    const currentTime = audio.currentTime || 0;
    const percentage = duration ? (currentTime / duration) * 100 : 0;

    progressLength.style.width = `${clamp(percentage, 0, 100)}%`;

    if (currentTimeText) currentTimeText.textContent = formatTime(currentTime);
    if (durationText) durationText.textContent = formatTime(duration);
  };

  const setStatus = (message) => {
    if (statusText) statusText.textContent = message;
  };

  const saveState = () => {
    localStorage.setItem(storageKey, JSON.stringify({
      currentTime: audio.currentTime || 0,
      wasPlaying: !audio.paused,
      loop: audio.loop
    }));
  };

  const tryResumeAfterNavigation = () => {
    if (hasTriedResume || !savedState.wasPlaying) return;

    hasTriedResume = true;
    audio.play()
      .then(() => {
        setStatus("Playing Rodeo Remix");
        updatePlayState();
      })
      .catch(() => {
        setStatus("Click play to continue music");
        updatePlayState();
      });
  };

  playButton.addEventListener("click", () => {
    if (audio.paused) {
      audio.play()
        .then(() => {
          setStatus("Playing Rodeo Remix");
          saveState();
          updatePlayState();
        })
        .catch(() => {
          setStatus("Click again or check browser/tab volume.");
          updatePlayState();
        });
      return;
    }

    audio.pause();
    setStatus("Paused");
    saveState();
    updatePlayState();
  });

  backwardButton?.addEventListener("click", () => {
    audio.currentTime = Math.max(audio.currentTime - 5, 0);
    updateProgress();
  });

  forwardButtons.forEach((button) => {
    button.addEventListener("click", () => {
      audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || audio.currentTime + 5);
      updateProgress();
    });
  });

  loopButton?.addEventListener("click", () => {
    audio.loop = !audio.loop;
    loopButton.classList.toggle("is-active", audio.loop);
    setStatus(audio.loop ? "Loop is on" : "Loop is off");
    saveState();
  });

  progressButton.addEventListener("click", (event) => {
    if (!audio.duration) return;

    const rect = progressButton.getBoundingClientRect();
    const percentage = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    audio.currentTime = percentage * audio.duration;
    updateProgress();
  });

  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(savedState.currentTime) && savedState.currentTime > 0) {
      audio.currentTime = Math.min(savedState.currentTime, audio.duration || savedState.currentTime);
      updateProgress();
    }

    if (typeof savedState.loop === "boolean") {
      audio.loop = savedState.loop;
      loopButton?.classList.toggle("is-active", audio.loop);
    }

    tryResumeAfterNavigation();
  });
  audio.addEventListener("canplay", () => {
    if (audio.paused) setStatus("Ready to play");
  });
  audio.addEventListener("timeupdate", () => {
    updateProgress();
    saveState();
  });
  audio.addEventListener("play", () => {
    updatePlayState();
    saveState();
  });
  audio.addEventListener("pause", () => {
    updatePlayState();
    saveState();
  });
  audio.addEventListener("error", () => {
    setStatus("MP3 file could not load.");
  });
  window.addEventListener("beforeunload", saveState);

  updatePlayState();
  updateProgress();
}

document.addEventListener("DOMContentLoaded", () => {
  initRevealAnimation();
  initTiltCards();
  initHeroLight();
  initProjectRing();
  initHoloContactCard();
  initLocalMusicPlayer();
});
