/* =========================================================
   1. THREE.JS AMBIENT SPACE BACKGROUND
   Starfield + slowly rotating ringed planet + occasional comet
========================================================= */
(function initBackground(){
  try {
  const canvas = document.getElementById('bg-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
  camera.position.z = 60;

  // --- Starfield ---
  const starGeo = new THREE.BufferGeometry();
  const STAR_COUNT = 3200;
  const positions = new Float32Array(STAR_COUNT * 3);
  for(let i=0;i<STAR_COUNT;i++){
    positions[i*3]   = (Math.random()-0.5) * 900;
    positions[i*3+1] = (Math.random()-0.5) * 900;
    positions[i*3+2] = (Math.random()-0.5) * 600 - 100;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starColors = new Float32Array(STAR_COUNT * 3);
  const palette = [
    [0.75,0.84,1.0],   // cool white-blue
    [1.0,1.0,1.0],     // pure white
    [0.65,0.75,1.0],   // deeper blue
    [1.0,0.9,0.75],    // faint warm
  ];
  for(let i=0;i<STAR_COUNT;i++){
    const c = palette[Math.floor(Math.random()*palette.length)];
    starColors[i*3]=c[0]; starColors[i*3+1]=c[1]; starColors[i*3+2]=c[2];
  }
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({ size:1.3, transparent:true, opacity:0.9, vertexColors:true });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // twinkle via opacity flicker on a second, sparser star layer
  const starGeo2 = new THREE.BufferGeometry();
  const STAR_COUNT2 = 200;
  const positions2 = new Float32Array(STAR_COUNT2 * 3);
  for(let i=0;i<STAR_COUNT2;i++){
    positions2[i*3]   = (Math.random()-0.5) * 700;
    positions2[i*3+1] = (Math.random()-0.5) * 700;
    positions2[i*3+2] = (Math.random()-0.5) * 400;
  }
  starGeo2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
  const starMat2 = new THREE.PointsMaterial({ color:0x9ec4ff, size:2.2, transparent:true, opacity:0.9 });
  const stars2 = new THREE.Points(starGeo2, starMat2);
  scene.add(stars2);

  // --- Ringed planet (Saturn-style), positioned top-right like the reference design ---
  const planetGroup = new THREE.Group();
  const planetGeo = new THREE.SphereGeometry(11, 48, 48);
  const planetMat = new THREE.MeshBasicMaterial({ color:0x2a3a66, transparent:true, opacity:0.55 });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  planetGroup.add(planet);

  const ringGeo = new THREE.RingGeometry(15, 24, 64);
  // fix UV mapping so the ring texture radiates correctly
  const ringPos = ringGeo.attributes.position;
  const v3 = new THREE.Vector3();
  for (let i=0; i<ringPos.count; i++){
    v3.fromBufferAttribute(ringPos, i);
    ringGeo.attributes.uv.setXY(i, v3.length() < 19.5 ? 0 : 1, 1);
  }
  const ringMat = new THREE.MeshBasicMaterial({ color:0x6fb7ff, transparent:true, opacity:0.18, side:THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI/2.4;
  ring.rotation.z = 0.3;
  planetGroup.add(ring);

  planetGroup.position.set(180, 90, -220);
  scene.add(planetGroup);

  // --- Comets: bright silver-white streaks with a soft glowing halo, spawn periodically ---
  const MAX_COMETS = 3;
  const comets = [];
  for(let i=0;i<MAX_COMETS;i++){
    const group = new THREE.Group();

    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const coreMat = new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0 });
    const core = new THREE.Line(coreGeo, coreMat);
    group.add(core);

    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const haloMat = new THREE.LineBasicMaterial({ color:0xbcd8ff, transparent:true, opacity:0, linewidth:1 });
    const halo = new THREE.Line(haloGeo, haloMat);
    group.add(halo);

    scene.add(group);
    comets.push({ core, coreMat, halo, haloMat, active:false, progress:0, start:null, end:null, speed:0.5 + Math.random()*0.3 });
  }

  let cometTimer = 1.5;

  function spawnComet(c){
    const fromLeft = Math.random() > 0.5;
    const y0 = 120 + Math.random()*140;
    c.start = new THREE.Vector3(fromLeft ? -320 : 320, y0, -140 - Math.random()*80);
    c.end = new THREE.Vector3(fromLeft ? 260 : -260, y0 - 200 - Math.random()*60, c.start.z);
    c.active = true; c.progress = 0;
  }

  function resize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    stars.rotation.y += dt * 0.004;
    stars2.rotation.y += dt * 0.006;
    stars2.material.opacity = 0.6 + Math.sin(t*2)*0.3;

    planetGroup.rotation.y += dt * 0.05;
    planetGroup.position.y = 90 + Math.sin(t*0.3) * 6;

    cometTimer += dt;
    if(cometTimer > 2.8){
      const idle = comets.find(c => !c.active);
      if(idle){ cometTimer = 0; spawnComet(idle); }
    }
    comets.forEach(c=>{
      if(!c.active) return;
      c.progress += dt * c.speed;
      if(c.progress >= 1){ c.active = false; c.coreMat.opacity = 0; c.haloMat.opacity = 0; return; }
      const head = c.start.clone().lerp(c.end, c.progress);
      const dir = c.end.clone().sub(c.start).normalize();
      const tail = head.clone().sub(dir.clone().multiplyScalar(26));
      const haloTail = head.clone().sub(dir.clone().multiplyScalar(46));

      const coreArr = c.core.geometry.attributes.position.array;
      coreArr[0]=tail.x; coreArr[1]=tail.y; coreArr[2]=tail.z;
      coreArr[3]=head.x; coreArr[4]=head.y; coreArr[5]=head.z;
      c.core.geometry.attributes.position.needsUpdate = true;

      const haloArr = c.halo.geometry.attributes.position.array;
      haloArr[0]=haloTail.x; haloArr[1]=haloTail.y; haloArr[2]=haloTail.z;
      haloArr[3]=head.x; haloArr[4]=head.y; haloArr[5]=head.z;
      c.halo.geometry.attributes.position.needsUpdate = true;

      const fade = Math.sin(c.progress * Math.PI);
      c.coreMat.opacity = fade;
      c.haloMat.opacity = fade * 0.4;
    });

    renderer.render(scene, camera);
  }
  animate();
  } catch (err) {
    console.warn('Ambient 3D background failed to load (page will still work normally):', err);
    const canvas = document.getElementById('bg-canvas');
    if (canvas) canvas.style.display = 'none';
  }
})();


/* =========================================================
   2. ASTEROID-CRASH PAGE TRANSITION (2D canvas overlay)
========================================================= */
const transitionCanvas = document.getElementById('transition-canvas');
const tctx = transitionCanvas.getContext('2d');
const impactFlash = document.getElementById('impact-flash');

function resizeTransitionCanvas(){
  transitionCanvas.width = window.innerWidth;
  transitionCanvas.height = window.innerHeight;
}
resizeTransitionCanvas();
window.addEventListener('resize', resizeTransitionCanvas);

function easeInCubic(x){ return x*x*x; }
function easeOutCubic(x){ return 1 - Math.pow(1-x, 3); }

/**
 * Plays a meteor flying in from a corner, crashing at screen center,
 * then calls onImpact() to swap page content, then fades the shockwave out.
 */
function playAsteroidCrash(onImpact){
  return new Promise(resolve => {
    const W = transitionCanvas.width, H = transitionCanvas.height;
    const startX = -120, startY = -120;
    const cx = W/2, cy = H/2;
    const asteroidR = Math.max(W,H) * 0.035;

    transitionCanvas.style.opacity = 1;
    let particles = [];
    let phase = 'fly'; // fly -> impact -> settle
    let flyProgress = 0;
    let impactTime = 0;
    const flyDuration = 0.55; // seconds
    let last = performance.now();
    let impactDone = false;

    function spawnDebris(){
      const count = 64;
      const palette = ['255,255,255', '223,235,255', '186,214,255', '245,245,255'];
      for(let i=0;i<count;i++){
        const angle = Math.random()*Math.PI*2;
        const speed = 280 + Math.random()*460;
        particles.push({
          x:cx, y:cy,
          vx:Math.cos(angle)*speed,
          vy:Math.sin(angle)*speed,
          life:1,
          size:1.5+Math.random()*4,
          color: palette[Math.floor(Math.random()*palette.length)]
        });
      }
    }

    function frame(now){
      const dt = Math.min((now-last)/1000, 0.05);
      last = now;
      tctx.clearRect(0,0,W,H);

      if(phase === 'fly'){
        flyProgress += dt/flyDuration;
        const p = Math.min(flyProgress, 1);
        const ep = easeInCubic(p);
        const x = startX + (cx-startX)*ep;
        const y = startY + (cy-startY)*ep;

        // trail — silvery-white with a faint blue glow
        const trailLen = 18;
        for(let i=0;i<trailLen;i++){
          const tp = Math.max(0, p - i*0.016);
          const etp = easeInCubic(tp);
          const tx = startX + (cx-startX)*etp;
          const ty = startY + (cy-startY)*etp;
          const alpha = (1 - i/trailLen) * 0.55;
          const r = asteroidR * (1 - i/trailLen*0.65);
          tctx.beginPath();
          const shade = 235 - i*3;
          tctx.fillStyle = `rgba(${shade},${shade},255,${alpha})`;
          tctx.arc(tx, ty, r*0.5, 0, Math.PI*2);
          tctx.fill();
        }

        // outer glow
        tctx.save();
        tctx.globalCompositeOperation = 'lighter';
        const glow = tctx.createRadialGradient(x,y,0,x,y,asteroidR*2.6);
        glow.addColorStop(0,'rgba(220,235,255,0.35)');
        glow.addColorStop(1,'rgba(220,235,255,0)');
        tctx.fillStyle = glow;
        tctx.beginPath();
        tctx.arc(x,y,asteroidR*2.6,0,Math.PI*2);
        tctx.fill();
        tctx.restore();

        // asteroid body — cool silver/white rock
        tctx.save();
        tctx.translate(x,y);
        tctx.rotate(p*8);
        const grad = tctx.createRadialGradient(-asteroidR*0.25,-asteroidR*0.25,asteroidR*0.1,0,0,asteroidR);
        grad.addColorStop(0,'#ffffff');
        grad.addColorStop(0.45,'#c9d8f0');
        grad.addColorStop(0.8,'#8b9ec2');
        grad.addColorStop(1,'#454f6b');
        tctx.fillStyle = grad;
        tctx.beginPath();
        tctx.arc(0,0,asteroidR,0,Math.PI*2);
        tctx.fill();
        tctx.restore();

        if(p >= 1){
          phase = 'impact';
          spawnDebris();
          impactFlash.style.transition = 'opacity 0.06s ease';
          impactFlash.style.opacity = 0.9;
          document.querySelector('.app').style.transition = 'transform 0.05s ease';
          setTimeout(()=>{ impactFlash.style.transition='opacity .5s ease'; impactFlash.style.opacity = 0; }, 60);
          shakeScreen();
          if(!impactDone){ impactDone = true; onImpact && onImpact(); }
        }
      }

      if(phase === 'impact'){
        impactTime += dt;
        // shockwave rings — bright silver-white, two layered rings
        const ringR = impactTime * 900;
        tctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.7 - impactTime*0.9)})`;
        tctx.lineWidth = 5;
        tctx.beginPath();
        tctx.arc(cx, cy, ringR, 0, Math.PI*2);
        tctx.stroke();

        tctx.strokeStyle = `rgba(190,215,255,${Math.max(0, 0.45 - impactTime*0.7)})`;
        tctx.lineWidth = 12;
        tctx.beginPath();
        tctx.arc(cx, cy, Math.max(0, ringR*0.7), 0, Math.PI*2);
        tctx.stroke();

        particles.forEach(pt=>{
          pt.x += pt.vx*dt;
          pt.y += pt.vy*dt;
          pt.vx *= 0.96; pt.vy *= 0.96;
          pt.life -= dt*1.1;
        });
        particles = particles.filter(pt=>pt.life>0);
        particles.forEach(pt=>{
          tctx.beginPath();
          tctx.fillStyle = `rgba(${pt.color},${Math.max(0,pt.life)})`;
          tctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2);
          tctx.fill();
        });

        if(impactTime > 0.9 && particles.length === 0){
          phase = 'done';
        }
      }

      if(phase === 'done'){
        transitionCanvas.style.transition = 'opacity .4s ease';
        transitionCanvas.style.opacity = 0;
        setTimeout(()=>{ transitionCanvas.style.transition=''; resolve(); }, 400);
        return;
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function shakeScreen(){
  const app = document.querySelector('.app');
  const frames = [
    'translate(0,0)', 'translate(-6px,4px)', 'translate(7px,-5px)',
    'translate(-5px,-4px)', 'translate(6px,5px)', 'translate(-3px,2px)', 'translate(0,0)'
  ];
  let i = 0;
  const iv = setInterval(()=>{
    app.style.transform = frames[i];
    i++;
    if(i>=frames.length){ clearInterval(iv); app.style.transform=''; }
  }, 35);
}

/* =========================================================
   3. PAGE ROUTER
========================================================= */
let isTransitioning = false;

function goToPage(pageId){
  if(isTransitioning) return;
  const current = document.querySelector('.page.active');
  if(current && current.id === `page-${pageId}`) return;
  isTransitioning = true;

  playAsteroidCrash(() => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const next = document.getElementById(`page-${pageId}`);
    if(next) next.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.nav === pageId);
    });
    const contentEl = document.querySelector('.content');
    if (contentEl) contentEl.scrollTop = 0;
    window.scrollTo(0,0);
  }).then(()=>{
    isTransitioning = false;
  });
}

document.querySelectorAll('[data-nav]').forEach(el=>{
  el.addEventListener('click', (e)=>{
    e.preventDefault();
    goToPage(el.dataset.nav);
  });
});

const contactForm = document.getElementById('contact-form');
contactForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const statusEl = document.getElementById('form-status');
  const btn = contactForm.querySelector('.send-btn');
  const endpoint = contactForm.getAttribute('action') || '';

  if (!endpoint || endpoint.includes('YOUR_FORM_ID')) {
    statusEl.textContent = 'Form not connected yet — replace YOUR_FORM_ID in index.html with your real Formspree endpoint (see README).';
    statusEl.className = 'form-status error';
    return;
  }

  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Sending…';
  statusEl.textContent = '';
  statusEl.className = 'form-status';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: new FormData(contactForm),
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      statusEl.textContent = "Message sent — thanks! I'll get back to you soon.";
      statusEl.className = 'form-status success';
      contactForm.reset();
    } else {
      statusEl.textContent = 'Something went wrong sending that — please try again or email me directly.';
      statusEl.className = 'form-status error';
    }
  } catch (err) {
    statusEl.textContent = 'Network error — please check your connection and try again.';
    statusEl.className = 'form-status error';
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});

/* =========================================================
   4. FLOATING SKILL WORDS (decorative background on Skills page)
========================================================= */
(function skillFloaters(){
  const words = ['Node.js','React','AWS','Docker','Kubernetes','MongoDB','TensorFlow','LLMs',
    'Python','Java','SQL','Redis','REST APIs','Microservices','CI/CD','System Design','Pandas','NumPy'];
  const container = document.getElementById('skills-floaters');
  words.forEach(word=>{
    const el = document.createElement('span');
    el.className = 'floater';
    el.textContent = word;
    el.style.left = Math.random()*85 + '%';
    el.style.top = Math.random()*90 + '%';
    el.style.fontSize = (11 + Math.random()*10) + 'px';
    el.style.animation = `floatSlow ${8+Math.random()*8}s ease-in-out infinite`;
    el.style.animationDelay = (Math.random()*5) + 's';
    container.appendChild(el);
  });
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes floatSlow {
      0%,100% { transform: translateY(0px); }
      50% { transform: translateY(-16px); }
    }`;
  document.head.appendChild(styleTag);
})();

/* =========================================================
   FOOTER — always show the current year automatically
========================================================= */
(function setCopyrightYear(){
  const yearEl = document.getElementById('copyright-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

/* =========================================================
   ZIGZAG TITLE ANIMATION — wraps each letter of every page
   title so CSS can animate them individually:
     - staggered letter-by-letter entrance every time the
       page becomes active
     - a continuous zigzag wave where each letter alternates
       up/down relative to its neighbor
     - hover illuminates the individual letter under the cursor
   Runs once on load; safely recurses through nested tags
   like <br> and <span class="accent"> without breaking them.
========================================================= */
(function waveTitles(){
  function wrapLetters(root){
    let i = 0;
    let wordBuffer = null;

    function makeLetterSpan(ch){
      const span = document.createElement('span');
      span.className = 'wave-letter';
      span.textContent = ch;
      const delay = (i * 0.085).toFixed(3);
      const waveName = (i % 2 === 0) ? 'waveUp' : 'waveDown';
      span.style.animation =
        `letterEnter .6s cubic-bezier(.2,.8,.2,1) ${delay}s both, ` +
        `${waveName} 2.2s ease-in-out infinite ${(i * 0.085 + 0.6).toFixed(3)}s`;
      i++;
      return span;
    }

    function walk(node){
      if (node.nodeType === Node.TEXT_NODE){
        const text = node.textContent;
        if (!text) return;
        const parent = node.parentNode;
        for (const ch of text){
          if (/\s/.test(ch)){
            wordBuffer = null; // end of a word — safe break point
            if (ch === ' ') parent.insertBefore(document.createTextNode(' '), node);
            // other whitespace (newlines/tabs from source formatting) is dropped
          } else {
            if (!wordBuffer){
              wordBuffer = document.createElement('span');
              wordBuffer.className = 'wave-word'; // atomic unit — wraps whole, never mid-word
              parent.insertBefore(wordBuffer, node);
            }
            wordBuffer.appendChild(makeLetterSpan(ch));
          }
        }
        parent.removeChild(node);
      } else if (node.nodeType === Node.ELEMENT_NODE){
        if (node.tagName === 'BR'){ wordBuffer = null; return; }
        Array.from(node.childNodes).forEach(walk);
      }
    }
    Array.from(root.childNodes).forEach(walk);
  }

  document.querySelectorAll('.hero-text h1, .page > h1, .work-intro h1, .contact-form-wrap h1')
    .forEach(wrapLetters);
})();

/* =========================================================
   SIDEBAR — sliding glow indicator that tracks the active
   nav button, in sync with the page router.
========================================================= */
(function navIndicator(){
  const indicator = document.getElementById('navIndicator');
  const buttons = Array.from(document.querySelectorAll('.nav-btn'));
  if (!indicator || !buttons.length) return;
  const STEP = 58; // 48px button height + 10px gap

  function updateIndicator(){
    const activeIndex = buttons.findIndex(b => b.classList.contains('active'));
    if (activeIndex === -1) return;
    indicator.style.transform = `translateY(${activeIndex * STEP}px)`;
  }

  updateIndicator();
  // re-sync whenever nav-btn active classes change (goToPage toggles them)
  const observer = new MutationObserver(updateIndicator);
  buttons.forEach(b => observer.observe(b, { attributes:true, attributeFilter:['class'] }));
})();

/* =========================================================
   SKILLS WORD-CLOUD — scattered floating skill words that
   drift gently and shift with cursor position (parallax by
   depth), matching the space/nebula aesthetic. Lightweight,
   no WebGL needed.
========================================================= */
(function skillsWordcloud(){
  const container = document.getElementById('skillsWordcloud');
  if (!container) return;

  const SKILLS = [
    'Java','Python','C++','JavaScript','TypeScript','SQL',
    'Spring Boot','REST APIs','Microservices','Redis',
    'Docker','Kubernetes','AWS','EC2','S3','Lambda','DynamoDB',
    'Git','Linux','CI/CD','System Design','OOP',
    'TensorFlow','Pandas','NumPy','Generative AI','LLMs',
    'React','Node.js','MongoDB','PostgreSQL','Distributed Systems',
  ];

  const words = SKILLS.map(text => {
    const el = document.createElement('span');
    el.textContent = text;
    const size = 11 + Math.random() * 16; // 11px - 27px
    const depth = 0.3 + Math.random() * 1;  // parallax strength
    el.style.left = (4 + Math.random() * 86) + '%';
    el.style.top = (4 + Math.random() * 86) + '%';
    el.style.fontSize = size + 'px';
    el.style.opacity = (0.25 + (size / 27) * 0.55).toFixed(2);
    el.dataset.depth = depth;
    el.style.animation = `wordDrift ${7 + Math.random()*6}s ease-in-out infinite`;
    el.style.animationDelay = (Math.random() * 5) + 's';
    container.appendChild(el);
    return { el, depth, baseX: 0, baseY: 0 };
  });

  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });
  container.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });

  function raf(){
    requestAnimationFrame(raf);
    curX += (targetX - curX) * 0.06;
    curY += (targetY - curY) * 0.06;
    words.forEach(w => {
      const shiftX = curX * 14 * w.depth;
      const shiftY = curY * 14 * w.depth;
      w.el.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
    });
  }
  raf();

  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes wordDrift {
      0%,100% { margin-top: 0px; }
      50% { margin-top: -12px; }
    }`;
  document.head.appendChild(styleTag);
})();
