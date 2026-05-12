/**
 * birthday-card / js/script.js
 * ─────────────────────────────────────────────────────────────
 * Handles: starfield · card open/close · confetti · balloons ·
 *          hearts · audio · typewriter · mute button · keyboard
 * ─────────────────────────────────────────────────────────────
 */

/* ══════════════════════════════════════════════════
   1 ▸ CONSTANTS & CONFIG
══════════════════════════════════════════════════ */
const CFG = {
  typewriterSpeed : 38,          // ms per character
  balloonCount    : 7,
  balloonColors   : ['#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#c084fc','#f472b6'],
  heartEmojis     : ['❤️','💛','💜','💚','💙','🧡'],
  audioSrc        : 'assets/audio/birthday.mp3',   // provide your own file
  audioFallbackFreq: 523.25,     // C5 – synthesised tone fallback
  confettiColors  : ['#f5c842','#f87171','#c084fc','#60a5fa','#4ade80','#fb923c','#fff'],
};

/* ══════════════════════════════════════════════════
   2 ▸ DOM REFERENCES
══════════════════════════════════════════════════ */
const $  = id => document.getElementById(id);
const cardStage   = $('card-stage');
const cardEl      = $('card');
const cardFront   = $('card-front');
const cardInside  = $('card-inside');
const msgEl       = $('msg-text');
const muteBtn     = $('mute-btn');
const confettiCvs = $('confetti-canvas');
const hint        = $('hint');

/* ══════════════════════════════════════════════════
   3 ▸ STATE
══════════════════════════════════════════════════ */
let state         = 'idle';   // idle | opening | opened | closing
let audio         = null;
let audioCtx      = null;
let gainNode      = null;
let isMuted       = false;
let synthLoopTimer = null;
let confettiAnim  = null;
let balloonTimers = [];
let confettiParts = [];
let candleBlown   = false;
let micStream     = null;

/* ══════════════════════════════════════════════════
   4 ▸ STARFIELD (canvas)
══════════════════════════════════════════════════ */
(function initStarfield () {
  const cvs = $('starfield');
  const ctx = cvs.getContext('2d');
  let W, H, stars;

  function resize () {
    W = cvs.width  = window.innerWidth;
    H = cvs.height = window.innerHeight;
    stars = Array.from({ length: 160 }, () => ({
      x    : Math.random() * W,
      y    : Math.random() * H,
      r    : Math.random() * 1.6 + .3,
      speed: Math.random() * .25 + .05,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw (t) {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      const alpha = .35 + .55 * Math.sin(t * .001 * s.speed * 6 + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,220,${alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();

/* ══════════════════════════════════════════════════
   5 ▸ CONFETTI
══════════════════════════════════════════════════ */
(function initConfetti () {
  const ctx = confettiCvs.getContext('2d');
  let W, H;

  function resize () {
    W = confettiCvs.width  = window.innerWidth;
    H = confettiCvs.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function Particle (x, y) {
    this.x    = x;
    this.y    = y;
    this.vx   = (Math.random() - .5) * 14;
    this.vy   = Math.random() * -12 - 6;
    this.g    = .45;
    this.r    = Math.random() * 7 + 4;
    this.color= CFG.confettiColors[Math.floor(Math.random() * CFG.confettiColors.length)];
    this.spin = Math.random() * Math.PI * 2;
    this.spinV= (Math.random() - .5) * .25;
    this.shape= Math.random() > .4 ? 'rect' : 'circle';
    this.life = 1;
    this.decay= Math.random() * .012 + .008;
  }

  function burst (x, y, count = 90) {
    for (let i = 0; i < count; i++) {
      confettiParts.push(new Particle(x, y));
    }
  }

  function loop () {
    confettiAnim = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, W, H);

    confettiParts = confettiParts.filter(p => p.life > 0);

    confettiParts.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.g;
      p.spin += p.spinV;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.r, -p.r * .4, p.r * 2, p.r * .8);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r * .5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }
  loop();

  // Expose burst globally
  window.burstConfetti = (x, y, count) => burst(x, y, count);
  window.clearConfetti = () => { confettiParts = []; };
})();

/* ══════════════════════════════════════════════════
   6 ▸ BALLOONS
══════════════════════════════════════════════════ */
function spawnBalloon () {
  const balloon = document.createElement('div');
  balloon.className = 'balloon';

  const color = CFG.balloonColors[Math.floor(Math.random() * CFG.balloonColors.length)];
  const size  = 48 + Math.random() * 30; // 48–78 px
  const left  = 5 + Math.random() * 85;  // % from left
  const dur   = 5 + Math.random() * 5;   // 5–10 s

  balloon.style.left     = left + '%';
  balloon.style.animationDuration = dur + 's';

  balloon.innerHTML = `
    <svg width="${size}" height="${size * 1.3}" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="32" rx="26" ry="30" fill="${color}" opacity=".9"/>
      <ellipse cx="22" cy="22" rx="8" ry="6" fill="rgba(255,255,255,.28)"/>
      <path d="M30 62 Q28 68 30 72 Q32 68 30 62Z" fill="${color}" opacity=".7"/>
      <path d="M30 72 Q26 76 24 80" stroke="${color}" stroke-width="1.5" opacity=".5"/>
      <path d="M30 72 Q34 76 36 80" stroke="${color}" stroke-width="1.5" opacity=".5"/>
    </svg>`;

  document.body.appendChild(balloon);

  balloon.addEventListener('animationend', () => balloon.remove());
}

function startBalloons () {
  // Initial burst
  for (let i = 0; i < CFG.balloonCount; i++) {
    balloonTimers.push(setTimeout(spawnBalloon, i * 300));
  }
  // Keep spawning while card is open
  const interval = setInterval(() => {
    if (state !== 'opened') { clearInterval(interval); return; }
    spawnBalloon();
  }, 1800);
  balloonTimers.push(interval);
}

function stopBalloons () {
  balloonTimers.forEach(clearTimeout);
  balloonTimers = [];
  document.querySelectorAll('.balloon').forEach(b => b.remove());
}

/* ══════════════════════════════════════════════════
   7 ▸ HEART PARTICLES
══════════════════════════════════════════════════ */
function spawnHearts (x, y, count = 6) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'heart-particle';
    el.textContent = CFG.heartEmojis[Math.floor(Math.random() * CFG.heartEmojis.length)];
    el.style.left  = (x - 20 + Math.random() * 40) + 'px';
    el.style.top   = (y - 20 + Math.random() * 40) + 'px';
    el.style.animationDelay = (Math.random() * .4) + 's';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

/* ══════════════════════════════════════════════════
   8 ▸ AUDIO
══════════════════════════════════════════════════ */
function initAudio () {
  // Try <audio> element first (real mp3)
  audio = new Audio(CFG.audioSrc);
  audio.loop   = true;
  audio.volume = 0;

  audio.play().then(() => {
    fadeInAudio();
    showBlowPrompt();
  }).catch(() => {
    // Fallback: synthesised happy-birthday melody via WebAudio
    playSynthBirthday();
  });

  muteBtn.classList.add('visible');
}

function fadeInAudio (target = .8, duration = 2000) {
  if (!audio) return;
  const step = 50;
  const inc  = (target - audio.volume) / (duration / step);
  const iv = setInterval(() => {
    audio.volume = Math.min(target, audio.volume + inc);
    if (audio.volume >= target) clearInterval(iv);
  }, step);
}

function stopAudio () {
  if (audio) {
    const step = 50;
    const dec  = audio.volume / (600 / step);
    const iv   = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - dec);
      if (audio.volume <= 0) { audio.pause(); audio.currentTime = 0; clearInterval(iv); }
    }, step);
  }
  if (audioCtx) { audioCtx.close(); audioCtx = null; gainNode = null; }
  if (synthLoopTimer) { clearTimeout(synthLoopTimer); synthLoopTimer = null; }
  // Stop microphone stream
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  muteBtn.classList.remove('visible');
}

function toggleMute () {
  isMuted = !isMuted;
  if (audio)    audio.muted = isMuted;
  if (gainNode) gainNode.gain.value = isMuted ? 0 : .7;
  muteBtn.textContent = isMuted ? '🔇' : '🔊';
}

// Simple WebAudio synthesiser – plays a recognisable "Happy Birthday" motif
function playSynthBirthday () {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(.7, audioCtx.currentTime + 2);
  gainNode.connect(audioCtx.destination);

  // Happy-birthday note sequence: freq (Hz), start (s), duration (s)
  const notes = [
    [261.63,.0,.4],[261.63,.45,.15],[293.66,.6,.55],
    [261.63,1.2,.55],[349.23,1.8,.55],[329.63,2.4,1.0],
    [261.63,3.6,.4],[261.63,4.05,.15],[293.66,4.2,.55],
    [261.63,4.8,.55],[392.00,5.4,.55],[349.23,6.0,1.0],
    [261.63,7.2,.4],[261.63,7.65,.15],[523.25,7.8,.55],
    [440.00,8.4,.55],[349.23,9.0,.4],[329.63,9.45,.4],
    [293.66,9.9,1.0],[466.16,11.,.4],[466.16,11.45,.15],
    [440.00,11.6,.55],[349.23,12.2,.55],[392.00,12.8,.55],[349.23,13.4,1.4],
  ];

  function playSequence () {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    notes.forEach(([freq, start, dur]) => {
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, now + start);
      env.gain.linearRampToValueAtTime(.8, now + start + .04);
      env.gain.exponentialRampToValueAtTime(.001, now + start + dur);
      osc.connect(env);
      env.connect(gainNode);
      osc.start(now + start);
      osc.stop(now + start + dur + .05);
    });

    const loopDurationMs = 14900;
    synthLoopTimer = setTimeout(playSequence, loopDurationMs);
  }

  playSequence();

  muteBtn.classList.add('visible');
  showBlowPrompt();
}

/* ══════════════════════════════════════════════════
   8b ▸ CANDLE BLOW DETECTION
══════════════════════════════════════════════════ */
let promptShown = false;

function showBlowPrompt () {
  if (promptShown) return;
  promptShown = true;

  const promptEl = document.getElementById('blow-prompt');
  const okBtn = document.getElementById('blow-prompt-ok');

  if (!promptEl || !okBtn) {
    console.warn('Blow prompt elements not found');
    return;
  }

  promptEl.classList.add('show');

  // Remove any previous listeners and add new one
  const newOkBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);

  newOkBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    promptEl.classList.remove('show');
    promptShown = false;
    requestMicrophonePermission();
  });
}

function requestMicrophonePermission () {
  if (!navigator.mediaDevices?.getUserMedia) return;

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      micStream = stream;
      const micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = micAudioCtx.createMediaStreamSource(stream);
      const analyser = micAudioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastBlowTime = 0;

      function detectBlow () {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const now = Date.now();

        // Blow detected: sustained low frequencies
        if (average > 30 && (now - lastBlowTime) > 100) {
          lastBlowTime = now;
          extinguishCandle();
        }
        requestAnimationFrame(detectBlow);
      }
      detectBlow();
    })
    .catch(() => {
      console.log('Microphone not available, use spacebar to blow');
    });
}

function extinguishCandle () {
  if (candleBlown) return;
  candleBlown = true;
  const fire = document.getElementById('candle-fire');
  if (fire) {
    fire.classList.add('blown');
  }
}

/* ══════════════════════════════════════════════════
   9 ▸ TYPEWRITER
══════════════════════════════════════════════════ */
const fullMessage = "Happy 19th Birthday, Erica Mae! ma view man nimo ni or dele okay lang, Wishing for your continuous happiness which I'm so thankful you've already found, Praying for your good health, mental health, and success. Goodluck future (RN, USRN), Enjoy your day and Padayun lang!";

function typewrite (el, text, speed, done) {
  let i = 0;
  el.innerHTML = '<span class="cursor"></span>';
  function tick () {
    if (i < text.length) {
      el.innerHTML = text.slice(0, ++i) + '<span class="cursor"></span>';
      setTimeout(tick, speed);
    } else {
      el.querySelector('.cursor')?.remove();
      if (done) done();
    }
  }
  setTimeout(tick, speed);
}

/* ══════════════════════════════════════════════════
   10 ▸ FRONT SPARKLES (decorative stars on card cover)
══════════════════════════════════════════════════ */
const sparklePositions = [
  [12,10],[82,8],[6,72],[88,65],[45,5],[20,85],[75,78]
];
sparklePositions.forEach(([l, t]) => {
  const sp = document.createElement('span');
  sp.className = 'front-sparkle';
  sp.textContent = ['✦','✧','⭐','🌟','✨'][Math.floor(Math.random() * 5)];
  sp.style.cssText = `left:${l}%;top:${t}%;font-size:${10+Math.random()*10}px;
    animation-delay:${Math.random()*2.5}s;position:absolute;`;
  cardFront.appendChild(sp);
});

/* ══════════════════════════════════════════════════
   11 ▸ OPEN CARD
══════════════════════════════════════════════════ */
function openCard () {
  if (state !== 'idle') return;
  state = 'opening';

  hint.classList.add('hidden');

  // 3D flip stage
  cardStage.classList.add('card-stage-opening');

  // After flip begins, trigger confetti & balloons
  setTimeout(() => {
    const rect = cardStage.getBoundingClientRect();
    burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 3, 110);
    startBalloons();
  }, 300);

  // After cover fully opens (~900ms), show inside content
  setTimeout(() => {
    cardStage.classList.add('card-stage-opened');
    cardInside.classList.add('card-opened');
    state = 'opened';

    // Typewriter after fade-in settles
    setTimeout(() => {
      typewrite(msgEl, fullMessage, CFG.typewriterSpeed);
    }, 500);

    // Audio
    initAudio();

    // Spawn hearts from card centre
    const rect = cardStage.getBoundingClientRect();
    spawnHearts(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
  }, 950);
}

/* ══════════════════════════════════════════════════
   12 ▸ CLOSE CARD
══════════════════════════════════════════════════ */
function closeCard () {
  if (state !== 'opened' && state !== 'opening') return;
  state = 'closing';

  // Hide blow prompt if visible
  const promptEl = document.getElementById('blow-prompt');
  if (promptEl) promptEl.classList.remove('show');
  promptShown = false;

  // Reverse inside content
  cardInside.classList.remove('card-opened');

  // Reverse 3D flip after brief delay
  setTimeout(() => {
    cardStage.classList.remove('card-stage-opening', 'card-stage-opened');
  }, 200);

  // Clear effects
  stopBalloons();
  clearConfetti();
  stopAudio();

  // Reset candle
  candleBlown = false;
  const fire = document.getElementById('candle-fire');
  if (fire) {
    fire.classList.remove('blown');
  }

  setTimeout(() => {
    hint.classList.remove('hidden');
    state = 'idle';
    // Reset typewriter text
    msgEl.textContent = '';
  }, 1100);
}

/* ══════════════════════════════════════════════════
   13 ▸ EVENT LISTENERS
══════════════════════════════════════════════════ */

// Click on the card stage → open
cardStage.addEventListener('click', e => {
  e.stopPropagation();
  if (state === 'idle')   openCard();
  if (state === 'opened') {/* already open, ignore */ }
});

// Click outside card → close
document.addEventListener('click', e => {
  const promptEl = document.getElementById('blow-prompt');
  const promptVisible = promptEl && promptEl.classList.contains('show');

  if (state === 'opened' && !cardStage.contains(e.target) && e.target !== muteBtn && !promptVisible) {
    closeCard();
  }
});

// Close button inside card
document.getElementById('close-btn').addEventListener('click', e => {
  e.stopPropagation();
  if (state === 'opened') closeCard();
});

// Mute button
muteBtn.addEventListener('click', e => {
  e.stopPropagation();
  toggleMute();
});

// Keyboard: Enter/Space opens, Escape closes
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (state === 'idle') openCard();
    else if (state === 'opened' && !candleBlown) extinguishCandle();
  }
  if (e.key === 'Escape')                 { if (state === 'opened') closeCard(); }
  if (e.key === 'm' || e.key === 'M')     { if (state === 'opened') toggleMute(); }
});

// ARIA: make card stage focusable + keyboard accessible
cardStage.setAttribute('role', 'button');
cardStage.setAttribute('tabindex', '0');
cardStage.setAttribute('aria-label', 'Open birthday card');

// Hover: spawn mini hearts near card
cardStage.addEventListener('mousemove', e => {
  if (state !== 'idle') return;
  if (Math.random() > .97) {
    spawnHearts(e.clientX, e.clientY, 1);
  }
});
