/* =====================================================================
   THE LIGHTKEEPER'S FAIRY
   A dark-fantasy Three.js scene: the cursor becomes a magic orb, and a
   procedural forest-spirit fairy (a slender glowing figure with four
   iridescent wings and hair built from the same follow-the-leader
   "chain" technique used for schooling fish / a dragon's tail) drifts
   toward it, curious — or roams the ruins on her own once the light
   is snuffed out.
   No external models/textures/audio: everything here is generated in
   code so the file runs standalone, no /assets folder required.
===================================================================== */

(() => {
  "use strict";

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------------------------------------------------------------
     RENDERER / SCENE / CAMERA
  --------------------------------------------------------------- */
  const canvas = document.getElementById('scene-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0f1f, 0.028);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
  const camBase = new THREE.Vector3(0, 1.5, 20);
  camera.position.copy(camBase);
  camera.lookAt(0, 0, 0);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ---------------------------------------------------------------
     LIGHTING
  --------------------------------------------------------------- */
  scene.add(new THREE.AmbientLight(0x30355a, 0.9));

  const moonLight = new THREE.DirectionalLight(0x9fb4ff, 0.65);
  moonLight.position.set(-12, 18, -10);
  scene.add(moonLight);

  const orbLight = new THREE.PointLight(0x7ff6ff, 2.2, 14, 2);
  scene.add(orbLight);

  const fairyLight = new THREE.PointLight(0xf3c9ff, 1.1, 8, 2); // her own soft magical glow
  scene.add(fairyLight);

  /* ---------------------------------------------------------------
     SKY: STARS, MOON, AURORA
  --------------------------------------------------------------- */
  function buildStars() {
    const count = 1400;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = rand(40, 90);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(rand(-0.2, 1));
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 4;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 20;
      sizes[i] = rand(0.4, 1.6);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({ color: 0xdfe9ff, size: 0.5, transparent: true, opacity: 0.85, sizeAttenuation: true });
    const stars = new THREE.Points(geo, mat);
    scene.add(stars);
    return { points: stars, mat };
  }
  const starField = buildStars();

  function buildMoon() {
    const group = new THREE.Group();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xf4e8c1, emissive: 0xf4e8c1, emissiveIntensity: 0.55, roughness: 0.9 })
    );
    group.add(moon);
    const haloTex = makeGlowTexture('#fff4d6');
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xfff0cf, transparent: true, opacity: 0.5, depthWrite: false }));
    halo.scale.set(14, 14, 1);
    group.add(halo);
    group.position.set(-16, 16, -35);
    scene.add(group);
  }
  buildMoon();

  // simple radial-gradient sprite texture, generated on a canvas (no image files needed)
  function makeGlowTexture(hexColor) {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.35, hexColor);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  const glowTexSoft = makeGlowTexture('#7ff6ff');
  const glowTexWarm = makeGlowTexture('#ffe3b0');
  const glowTexPink = makeGlowTexture('#ffb6d9');

  function buildAurora() {
    const geo = new THREE.PlaneGeometry(70, 18, 40, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, Math.sin(i * 0.35) * 1.4);
    }
    const mat = new THREE.MeshBasicMaterial({
      color: 0x66ffd9, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 20, -45);
    mesh.rotation.x = 0.15;
    scene.add(mesh);
    return mesh;
  }
  const aurora = buildAurora();

  /* ---------------------------------------------------------------
     FLOATING ISLANDS, CASTLE RUINS, ROCKS, TREES, CRYSTALS
  --------------------------------------------------------------- */
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x3c4152, roughness: 0.95, metalness: 0.05 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a6270, roughness: 0.85 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a2116, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1d3d2a, roughness: 0.9 });

  const crystals = [];   // { mesh, baseIntensity }
  const trees = [];      // { group, wobble }
  const fireflies = [];  // handled in its own particle system below

  function makeIslandRock(scale) {
    const geo = new THREE.DodecahedronGeometry(scale, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      v.multiplyScalar(1 + (Math.random() - 0.5) * 0.25);
      pos.setXYZ(i, v.x, v.y * 0.55, v.z);
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, rockMat);
  }

  function addCrystal(parent, localPos, color) {
    const geo = new THREE.OctahedronGeometry(rand(0.35, 0.7), 0);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(localPos);
    mesh.scale.y = 1.6;
    parent.add(mesh);
    crystals.push({ mesh, base: 0.9, worldPos: new THREE.Vector3() });
  }

  function addTree(parent, localPos) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.3, 6), trunkMat);
    trunk.position.y = 0.65;
    g.add(trunk);
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55 - i * 0.12, 0.9, 7), leafMat);
      leaf.position.y = 1.2 + i * 0.55;
      g.add(leaf);
    }
    g.position.copy(localPos);
    parent.add(g);
    trees.push({ group: g, wobble: 0 });
  }

  function addCastleRuin(parent, localPos, scale) {
    const g = new THREE.Group();
    const towerCount = 3;
    for (let i = 0; i < towerCount; i++) {
      const h = rand(1.6, 3.2) * scale;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * scale, 0.42 * scale, h, 8), stoneMat);
      tower.position.set((i - 1) * 0.9 * scale, h / 2, (i % 2) * 0.4 * scale);
      g.add(tower);
      // crenellations
      const crenTop = new THREE.Mesh(new THREE.CylinderGeometry(0.44 * scale, 0.44 * scale, 0.18 * scale, 8), stoneMat);
      crenTop.position.set(tower.position.x, h + 0.09 * scale, tower.position.z);
      g.add(crenTop);
    }
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6 * scale, 0.9 * scale, 0.25 * scale), stoneMat);
    wall.position.set(0, 0.45 * scale, 0.2 * scale);
    g.add(wall);
    g.position.copy(localPos);
    parent.add(g);
  }

  const islandSites = [
    { pos: new THREE.Vector3(-9, -3, -4), scale: 2.3, castle: true, crystals: 2, trees: 2 },
    { pos: new THREE.Vector3(8, 1.5, -6), scale: 1.6, castle: false, crystals: 3, trees: 1 },
    { pos: new THREE.Vector3(2, -5.5, 2), scale: 1.9, castle: false, crystals: 1, trees: 3 },
    { pos: new THREE.Vector3(-4, 5.5, -8), scale: 1.2, castle: false, crystals: 2, trees: 0 },
    { pos: new THREE.Vector3(12, -2, 3), scale: 1.0, castle: false, crystals: 1, trees: 1 },
  ];
  const islandGroups = [];
  const flowerSprites = []; // little blooms scattered on the islands — brighten when the fairy passes
  islandSites.forEach((site) => {
    const g = new THREE.Group();
    const rock = makeIslandRock(site.scale);
    g.add(rock);
    if (site.castle) addCastleRuin(g, new THREE.Vector3(0, site.scale * 0.5, 0), site.scale * 0.8);
    for (let i = 0; i < site.crystals; i++) {
      addCrystal(g, new THREE.Vector3(rand(-1, 1) * site.scale, site.scale * 0.45 + rand(0, 0.3), rand(-1, 1) * site.scale),
        [0xb98bff, 0x7ff6ff, 0xff9a6e][i % 3]);
    }
    for (let i = 0; i < site.trees; i++) {
      addTree(g, new THREE.Vector3(rand(-1, 1) * site.scale, site.scale * 0.5, rand(-1, 1) * site.scale));
    }
    // a few tiny flowers dotting each island's surface
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({ map: glowTexPink, color: [0xffb6d9, 0xffffff, 0xc9a6e8][i % 3], transparent: true, opacity: 0.55, depthWrite: false });
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(0.16);
      s.position.set(rand(-1, 1) * site.scale, site.scale * 0.42, rand(-1, 1) * site.scale);
      g.add(s);
      flowerSprites.push({ sprite: s, baseScale: 0.16, baseOpacity: 0.55, bloom: 0 });
    }
    g.position.copy(site.pos);
    g.rotation.y = rand(0, Math.PI * 2);
    scene.add(g);
    islandGroups.push(g);
  });

  // small drifting debris rocks
  const debris = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.15, 0.4), 0), rockMat);
    m.position.set(rand(-16, 16), rand(-8, 8), rand(-10, 4));
    scene.add(m);
    debris.push({ mesh: m, spin: rand(0.05, 0.2), driftPhase: rand(0, 10) });
  }

  /* ---------------------------------------------------------------
     CLOUDS (soft flat sprites)
  --------------------------------------------------------------- */
  const cloudTex = makeGlowTexture('#8ea0c8');
  const clouds = [];
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.SpriteMaterial({ map: cloudTex, color: 0x2c3552, transparent: true, opacity: 0.22, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const scale = rand(8, 16);
    s.scale.set(scale, scale * 0.5, 1);
    s.position.set(rand(-20, 20), rand(-2, 9), rand(-15, -25));
    scene.add(s);
    clouds.push({ sprite: s, speed: rand(0.03, 0.09) });
  }

  /* ---------------------------------------------------------------
     FIREFLIES (small glowing points that drift, and gather toward the fairy)
  --------------------------------------------------------------- */
  const FIREFLY_COUNT = 40;
  const fireflyGroup = new THREE.Group();
  scene.add(fireflyGroup);
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const mat = new THREE.SpriteMaterial({ map: glowTexSoft, color: 0xbfffb0, transparent: true, opacity: rand(0.4, 0.9), depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.scale.setScalar(rand(0.12, 0.24));
    const home = new THREE.Vector3(rand(-14, 14), rand(-6, 6), rand(-6, 4));
    s.position.copy(home);
    fireflyGroup.add(s);
    fireflies.push({ sprite: s, home, phase: rand(0, 10) });
  }

  /* ---------------------------------------------------------------
     MAGIC ORB — the cursor's light
  --------------------------------------------------------------- */
  const orbPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2); // world plane z = 2
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2(0, 0);
  const orbTargetWorld = new THREE.Vector3(0, 0, 2);
  const orbPos = new THREE.Vector3(0, 0, 2);       // eased actual position
  let lightOn = true;
  let orbVisibility = 1;                            // eased 0..1 fade for toggling

  const orbGroup = new THREE.Group();
  const orbCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  orbGroup.add(orbCore);
  const orbHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexSoft, color: 0x8ff9ff, transparent: true, depthWrite: false }));
  orbHalo.scale.set(2.2, 2.2, 1);
  orbGroup.add(orbHalo);
  scene.add(orbGroup);

  // magic dust: sparkles drifting around the orb, plus a short fading trail
  const DUST_COUNT = 70;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_COUNT * 3);
  const dustSeed = [];
  for (let i = 0; i < DUST_COUNT; i++) {
    dustSeed.push({ r: rand(0.25, 1.1), a: rand(0, Math.PI * 2), speed: rand(0.6, 1.6), yFreq: rand(0.8, 2.2) });
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xbdfcff, size: 0.06, transparent: true, opacity: 0.9, sizeAttenuation: true, map: glowTexSoft, depthWrite: false, blending: THREE.AdditiveBlending });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  const TRAIL_LEN = 16;
  const trailPositions = [];
  for (let i = 0; i < TRAIL_LEN; i++) trailPositions.push(orbPos.clone());
  const trailGeo = new THREE.BufferGeometry();
  const trailArr = new Float32Array(TRAIL_LEN * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailArr, 3));
  const trailMat = new THREE.LineBasicMaterial({ color: 0x8ff9ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
  const trailLine = new THREE.Line(trailGeo, trailMat);
  scene.add(trailLine);

  function updateOrb(dt, t) {
    raycaster.setFromCamera(mouseNDC, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(orbPlane, hit)) orbTargetWorld.copy(hit);

    orbPos.lerp(orbTargetWorld, clamp(dt * 4.5, 0, 1));

    orbVisibility = lerp(orbVisibility, lightOn ? 1 : 0, clamp(dt * 2.2, 0, 1));
    const v = orbVisibility;
    orbGroup.visible = v > 0.01;
    orbGroup.position.copy(orbPos);
    orbGroup.scale.setScalar(0.6 + v * 0.4);
    orbCore.material.opacity = v;
    orbHalo.material.opacity = 0.6 * v + 0.15 * Math.sin(t * 6) * v;
    orbLight.position.copy(orbPos);
    orbLight.intensity = 2.2 * v + Math.sin(t * 9) * 0.15 * v;

    for (let i = 0; i < DUST_COUNT; i++) {
      const s = dustSeed[i];
      const ang = s.a + t * s.speed;
      const x = orbPos.x + Math.cos(ang) * s.r * v;
      const y = orbPos.y + Math.sin(t * s.yFreq + s.a) * 0.4 * s.r * v;
      const z = orbPos.z + Math.sin(ang) * s.r * v;
      dustPos[i * 3] = x; dustPos[i * 3 + 1] = y; dustPos[i * 3 + 2] = z;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity = 0.9 * v;

    trailPositions.pop();
    trailPositions.unshift(orbPos.clone());
    for (let i = 0; i < TRAIL_LEN; i++) {
      trailArr[i * 3] = trailPositions[i].x;
      trailArr[i * 3 + 1] = trailPositions[i].y;
      trailArr[i * 3 + 2] = trailPositions[i].z;
    }
    trailGeo.attributes.position.needsUpdate = true;
    trailMat.opacity = 0.35 * v;
  }

  window.addEventListener('mousemove', (e) => {
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  /* ---------------------------------------------------------------
     SYNTHESIZED AUDIO (no audio files — everything generated)
  --------------------------------------------------------------- */
  let audioCtx = null, masterGain, windGain, muted = false;
  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    const windBufferSize = 2 * audioCtx.sampleRate;
    const windBuffer = audioCtx.createBuffer(1, windBufferSize, audioCtx.sampleRate);
    const wd = windBuffer.getChannelData(0);
    for (let i = 0; i < windBufferSize; i++) wd[i] = Math.random() * 2 - 1;
    const windSrc = audioCtx.createBufferSource();
    windSrc.buffer = windBuffer; windSrc.loop = true;
    const windFilter = audioCtx.createBiquadFilter();
    windFilter.type = 'lowpass'; windFilter.frequency.value = 480;
    windGain = audioCtx.createGain(); windGain.gain.value = 0.12;
    windSrc.connect(windFilter); windFilter.connect(windGain); windGain.connect(masterGain);
    windSrc.start();

    scheduleShimmer();
  }
  function scheduleShimmer() {
    setTimeout(() => {
      if (audioCtx && !muted) {
        const now = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        o.type = 'sine';
        const g = audioCtx.createGain();
        g.gain.value = 0.0001;
        o.connect(g); g.connect(masterGain);
        const base = rand(900, 1500);
        o.frequency.setValueAtTime(base, now);
        o.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.4);
        g.gain.exponentialRampToValueAtTime(0.05, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        o.start(now); o.stop(now + 0.7);
      }
      scheduleShimmer();
    }, rand(2500, 5500));
  }
  // a bright ascending chime — used for her laugh, landings, and magic-casting
  function playChime() {
    if (!audioCtx || muted) return;
    const now = audioCtx.currentTime;
    const notes = [880, 1108, 1318];
    notes.forEach((freq, i) => {
      const o = audioCtx.createOscillator();
      o.type = 'sine';
      const g = audioCtx.createGain(); g.gain.value = 0.0001;
      o.connect(g); g.connect(masterGain);
      const start = now + i * 0.09;
      o.frequency.setValueAtTime(freq, start);
      g.gain.exponentialRampToValueAtTime(0.16, start + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
      o.start(start); o.stop(start + 0.55);
    });
  }
  // a soft, light wingbeat whoosh — much airier than a dragon's
  function playWhoosh() {
    if (!audioCtx || muted) return;
    const dur = 0.3;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const bp = audioCtx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
    const g = audioCtx.createGain(); g.gain.value = 0.1;
    src.connect(bp); bp.connect(g); g.connect(masterGain);
    src.start();
  }

  const soundToggleBtn = document.getElementById('sound-toggle');
  soundToggleBtn.addEventListener('click', () => {
    initAudio();
    muted = !muted;
    masterGain.gain.value = muted ? 0 : 0.5;
    soundToggleBtn.textContent = muted ? '🔇' : '🔊';
  });

  /* ---------------------------------------------------------------
     REUSABLE PARTICLE POOL (fairy dust / sparkle bursts)
  --------------------------------------------------------------- */
  class ParticlePool {
    constructor(count, color, size, texture) {
      this.pool = [];
      this.group = new THREE.Group();
      scene.add(this.group);
      for (let i = 0; i < count; i++) {
        const mat = new THREE.SpriteMaterial({ map: texture || glowTexSoft, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        const spr = new THREE.Sprite(mat);
        spr.scale.setScalar(size);
        this.group.add(spr);
        this.pool.push({ spr, active: false, life: 0, maxLife: 1, vel: new THREE.Vector3() });
      }
    }
    spawn(pos, vel, life, scaleMul = 1) {
      const p = this.pool.find((p) => !p.active);
      if (!p) return;
      p.active = true; p.life = life; p.maxLife = life;
      p.vel.copy(vel);
      p.spr.position.copy(pos);
      p.spr.scale.setScalar(scaleMul);
      p.baseScale = scaleMul;
      p.spr.material.opacity = 0.8;
    }
    update(dt) {
      this.pool.forEach((p) => {
        if (!p.active) return;
        p.life -= dt;
        if (p.life <= 0) { p.active = false; p.spr.material.opacity = 0; return; }
        p.spr.position.addScaledVector(p.vel, dt);
        p.vel.y += 0.06 * dt;
        const t = p.life / p.maxLife;
        p.spr.material.opacity = t * 0.85;
        p.spr.scale.setScalar((p.baseScale || 1) * (1.4 - t * 0.6));
      });
    }
  }
  const dustTrailPool = new ParticlePool(40, 0xd9c9ff, 0.14, glowTexSoft);
  const sparklePool = new ParticlePool(36, 0xffe9b8, 0.22, glowTexWarm);

  /* ---------------------------------------------------------------
     THE FAIRY (a factory — supports spawning any number of them)
  --------------------------------------------------------------- */
  const FAIRY_SCALE = 2.6;
  let speedMultiplier = 1;

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6ddc0, emissive: 0xfff1d0, emissiveIntensity: 0.35, roughness: 0.35 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xf0d27a, emissive: 0xf0d27a, emissiveIntensity: 0.3, roughness: 0.45 });
  const dressMat = new THREE.MeshStandardMaterial({ color: 0xf25fa8, emissive: 0xf25fa8, emissiveIntensity: 0.28, roughness: 0.45, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x5f9a52, roughness: 0.6 });
  const eyeMatF = new THREE.MeshStandardMaterial({ color: 0x8fe6d4, emissive: 0x8fe6d4, emissiveIntensity: 0.7 });
  const gemMat = new THREE.MeshStandardMaterial({ color: 0xb98bff, emissive: 0xb98bff, emissiveIntensity: 1.1, roughness: 0.2 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xd9788f, roughness: 0.5 });
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xfbfbf6, roughness: 0.4 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffb6d9, emissive: 0xffb6d9, emissiveIntensity: 0.4 });

  function makeWingTexture() {
    const size = 200;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 0.75;
      ctx.beginPath();
      ctx.moveTo(4, size - 4);
      ctx.lineTo(4 + Math.cos(ang) * size * 1.1, size - 4 - Math.sin(ang) * size * 1.1);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(4, size - 4, size * 0.55, -Math.PI * 0.42, -0.02); ctx.stroke();
    ctx.beginPath(); ctx.arc(4, size - 4, size * 0.85, -Math.PI * 0.42, -0.02); ctx.stroke();
    return new THREE.CanvasTexture(c);
  }
  const wingTexF = makeWingTexture();
  const wingMatF = new THREE.MeshStandardMaterial({ map: wingTexF, color: 0xa6e8ff, transparent: true, opacity: 0.62, roughness: 0.15, metalness: 0.1, emissive: 0x8fd9ff, emissiveIntensity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const wingGlowMat = new THREE.MeshBasicMaterial({ color: 0xcbb0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });

  function buildPetalShape() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.11, -0.08, 0.06, -0.26);
    shape.quadraticCurveTo(0.03, -0.34, 0, -0.36);
    shape.quadraticCurveTo(-0.03, -0.34, -0.06, -0.26);
    shape.quadraticCurveTo(-0.11, -0.08, 0, 0);
    return new THREE.ShapeGeometry(shape);
  }
  const HAIR_STRANDS = 3, HAIR_LINKS = 7, PETAL_COUNT = 6;

  function randomSpawnPos() {
    return new THREE.Vector3(rand(-6, 6), rand(-2, 3), rand(0, 3));
  }

  // builds one complete fairy (body, hair, wings, arms, butterflies) and its AI state
  function createFairy() {
    const fairyGroup = new THREE.Group();
    scene.add(fairyGroup);

    const bodyHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexPink, color: 0xffe3f5, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    bodyHalo.scale.set(1.3 * FAIRY_SCALE, 1.3 * FAIRY_SCALE, 1);
    bodyHalo.position.y = 0.15 * FAIRY_SCALE;
    fairyGroup.add(bodyHalo);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.22 * FAIRY_SCALE, 14, 12), skinMat);
    torso.scale.set(0.72, 1.35, 0.62);
    fairyGroup.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.185 * FAIRY_SCALE, 16, 14), skinMat);
    head.position.y = 0.44 * FAIRY_SCALE;
    fairyGroup.add(head);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018 * FAIRY_SCALE, 0.035 * FAIRY_SCALE, 6), skinMat);
    nose.position.set(0, 0.42 * FAIRY_SCALE, 0.175 * FAIRY_SCALE);
    nose.rotation.x = Math.PI / 2;
    fairyGroup.add(nose);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.032 * FAIRY_SCALE, 0.006 * FAIRY_SCALE, 6, 10, Math.PI * 0.7), mouthMat);
    mouth.position.set(0, 0.365 * FAIRY_SCALE, 0.155 * FAIRY_SCALE);
    mouth.rotation.set(Math.PI * 0.5, 0, Math.PI * 0.15);
    fairyGroup.add(mouth);
    const eyeMeshes = [];
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03 * FAIRY_SCALE, 0.14 * FAIRY_SCALE, 5), skinMat);
      ear.position.set(side * 0.16 * FAIRY_SCALE, 0.46 * FAIRY_SCALE, 0);
      ear.rotation.z = side * 0.9;
      ear.rotation.x = 0.3;
      fairyGroup.add(ear);
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.05 * FAIRY_SCALE, 10, 10), scleraMat);
      sclera.position.set(side * 0.075 * FAIRY_SCALE, 0.45 * FAIRY_SCALE, 0.145 * FAIRY_SCALE);
      fairyGroup.add(sclera);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036 * FAIRY_SCALE, 10, 10), eyeMatF);
      eye.position.set(side * 0.075 * FAIRY_SCALE, 0.45 * FAIRY_SCALE, 0.175 * FAIRY_SCALE);
      fairyGroup.add(eye);
      eyeMeshes.push(eye);
    });

    [-1, 1].forEach((side) => {
      if (Math.random() < 0.5) return;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.03 * FAIRY_SCALE, 8, 8), flowerMat);
      flower.position.set(side * 0.1 * FAIRY_SCALE, 0.5 * FAIRY_SCALE, -0.05 * FAIRY_SCALE);
      fairyGroup.add(flower);
    });

    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035 * FAIRY_SCALE, 0), gemMat);
    gem.position.set(0, 0.24 * FAIRY_SCALE, 0.13 * FAIRY_SCALE);
    fairyGroup.add(gem);

    const arms = [];
    [-1, 1].forEach((side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.13 * FAIRY_SCALE, 0.3 * FAIRY_SCALE, 0);
      const upperLen = 0.16 * FAIRY_SCALE;
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * FAIRY_SCALE, 0.018 * FAIRY_SCALE, upperLen, 6), skinMat);
      upper.position.y = -upperLen / 2;
      upper.rotation.z = side * 0.35;
      shoulder.add(upper);
      const forearmGroup = new THREE.Group();
      forearmGroup.position.set(Math.sin(side * 0.35) * upperLen * side, -upperLen * Math.cos(0.35), 0);
      const foreLen = 0.15 * FAIRY_SCALE;
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.017 * FAIRY_SCALE, 0.014 * FAIRY_SCALE, foreLen, 6), skinMat);
      forearm.position.y = -foreLen / 2;
      forearmGroup.add(forearm);
      for (let i = 0; i < 2; i++) {
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.02 * FAIRY_SCALE, 0.004 * FAIRY_SCALE, 6, 10), vineMat);
        wrap.position.y = -foreLen * (0.3 + i * 0.3);
        wrap.rotation.x = Math.PI / 2;
        forearmGroup.add(wrap);
      }
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.024 * FAIRY_SCALE, 8, 8), skinMat);
      hand.position.y = -foreLen;
      forearmGroup.add(hand);
      shoulder.add(forearmGroup);
      fairyGroup.add(shoulder);
      arms.push({ shoulder, forearmGroup, hand, side, restZ: side * 0.35 });
    });

    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * FAIRY_SCALE, 0.016 * FAIRY_SCALE, 0.2 * FAIRY_SCALE, 6), skinMat);
      leg.position.set(side * 0.05 * FAIRY_SCALE, -0.28 * FAIRY_SCALE, 0);
      fairyGroup.add(leg);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.03 * FAIRY_SCALE, 0.06 * FAIRY_SCALE, 5), vineMat);
      leaf.position.set(side * 0.05 * FAIRY_SCALE, -0.39 * FAIRY_SCALE, 0.02 * FAIRY_SCALE);
      leaf.rotation.x = Math.PI * 0.42;
      leaf.scale.z = 0.5;
      fairyGroup.add(leaf);
    });

    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.26 * FAIRY_SCALE, 0.5 * FAIRY_SCALE, 16, 1, true), dressMat);
    skirt.position.y = -0.14 * FAIRY_SCALE;
    fairyGroup.add(skirt);
    const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * FAIRY_SCALE, 0.2 * FAIRY_SCALE, 0.16 * FAIRY_SCALE, 12), dressMat);
    bodice.position.y = 0.14 * FAIRY_SCALE;
    fairyGroup.add(bodice);

    for (let i = 0; i < PETAL_COUNT; i++) {
      const petal = new THREE.Mesh(buildPetalShape(), dressMat);
      const ang = (i / PETAL_COUNT) * Math.PI * 2;
      petal.scale.setScalar(FAIRY_SCALE * (0.95 + (i % 2) * 0.08));
      petal.position.set(Math.cos(ang) * 0.22 * FAIRY_SCALE, -0.38 * FAIRY_SCALE, Math.sin(ang) * 0.22 * FAIRY_SCALE);
      petal.rotation.y = -ang;
      petal.rotation.x = -0.25;
      fairyGroup.add(petal);
    }

    const hairChains = [];
    for (let s = 0; s < HAIR_STRANDS; s++) {
      const rootOffset = new THREE.Vector3((s - 1) * 0.09 * FAIRY_SCALE, 0.48 * FAIRY_SCALE, -0.1 * FAIRY_SCALE);
      const meshes = [];
      const bones = [];
      const points = [];
      const radii = [];
      for (let i = 0; i < HAIR_LINKS; i++) {
        const r = lerp(0.045, 0.008, i / (HAIR_LINKS - 1)) * FAIRY_SCALE;
        radii.push(r);
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), hairMat);
        fairyGroup.add(m);
        meshes.push(m);
        points.push(new THREE.Vector3());
      }
      for (let i = 0; i < HAIR_LINKS - 1; i++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(radii[i + 1] * 0.9, radii[i] * 0.9, 1, 8, 1, true), hairMat);
        fairyGroup.add(bone);
        bones.push(bone);
      }
      hairChains.push({ rootOffset, meshes, bones, points, phase: rand(0, 10) });
    }

    const wingPivots = [];
    [-1, 1].forEach((side) => {
      [
        { key: 'upper', y: 0.4, scale: 1.0, z: -0.08 },
        { key: 'lower', y: 0.2, scale: 0.72, z: -0.05 },
      ].forEach((cfg) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.08 * FAIRY_SCALE, cfg.y * FAIRY_SCALE, cfg.z * FAIRY_SCALE);
        const w = 0.62 * FAIRY_SCALE * cfg.scale, h = 0.46 * FAIRY_SCALE * cfg.scale;
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 1), wingMatF.clone());
        wing.position.x = side * w * 0.42;
        pivot.add(wing);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.3, h * 1.3, 1, 1), wingGlowMat);
        glow.position.copy(wing.position);
        glow.position.z -= 0.01;
        pivot.add(glow);
        fairyGroup.add(pivot);
        wingPivots.push({ pivot, wing, side, tier: cfg.key, phase: cfg.key === 'upper' ? 0 : 0.35, hueSeed: rand(0, 1) });
      });
    });

    const butterflies = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({ map: glowTexPink, color: [0xffe9b8, 0xbfe9ff, 0xffb6d9][i], transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(0.12);
      scene.add(s);
      butterflies.push({ sprite: s, radius: rand(0.6, 1.3), speed: rand(0.6, 1.3), phase: rand(0, 10), yFreq: rand(0.5, 1.2) });
    }

    const spawnPos = randomSpawnPos();
    return {
      fairyGroup, bodyHalo, eyeMeshes, arms, hairChains, wingPivots, butterflies,
      pos: spawnPos.clone(),
      vel: new THREE.Vector3(0, 0, 0),
      forward: new THREE.Vector3(0, 0, 1),
      bank: 0,
      maxSpeedFollow: 3.4,
      maxSpeedRoam: 2.0,
      maxForce: 7,
      flapPhase: rand(0, 6),
      hairSwayPhase: rand(0, 6),
      state: 'FOLLOWING',
      behavior: 'approach',
      searchTimer: 0,
      landed: false,
      landTimer: 0,
      danceTimer: 0,
      waypoint: randomSpawnPos(),
      orbIdleTimer: 0,
      lastOrbPos: orbPos.clone(),
      castCooldown: rand(3, 6),
      laughCooldown: rand(6, 11),
      blinkTimer: rand(2, 5),
      blinking: 0,
      wanderCooldown: rand(3, 6),
    };
  }

  function disposeFairy(f) {
    scene.remove(f.fairyGroup);
    f.butterflies.forEach((b) => scene.remove(b.sprite));
  }

  const ROAM_MIN = new THREE.Vector3(-15, -7, -9);
  const ROAM_MAX = new THREE.Vector3(15, 7, 3);
  function randomWaypoint() {
    return new THREE.Vector3(rand(ROAM_MIN.x, ROAM_MAX.x), rand(ROAM_MIN.y, ROAM_MAX.y), rand(ROAM_MIN.z, ROAM_MAX.z));
  }
  function randomPerch() {
    const pool = [];
    crystals.forEach((c) => pool.push(c.worldPos.clone().add(new THREE.Vector3(0, 0.3, 0))));
    trees.forEach((tr) => { const p = new THREE.Vector3(); tr.group.getWorldPosition(p); pool.push(p.add(new THREE.Vector3(0, 1.6, 0))); });
    if (!pool.length) return randomWaypoint();
    return pool[Math.floor(Math.random() * pool.length)].clone();
  }

  const hudLight = document.getElementById('hud-light');
  const hudState = document.getElementById('hud-state');
  let camShakeTime = 0, camShakeMag = 0;

  // each additional fairy is a little smaller — 1 fairy = full size (10), each
  // fairy after that steps down by 1 (2 fairies = 9, 3 = 8, ...), floored so
  // she never shrinks to nothing.
  function sizeFactorForCount(n) {
    return clamp(10 - (n - 1), 3, 10) / 10;
  }

  const fairies = [createFairy()];
  fairies[0].fairyGroup.scale.setScalar(sizeFactorForCount(1));

  function setFairyCount(n) {
    n = Math.max(1, Math.min(10, n));
    while (fairies.length < n) fairies.push(createFairy());
    while (fairies.length > n) disposeFairy(fairies.pop());
    const factor = sizeFactorForCount(fairies.length);
    fairies.forEach((f) => f.fairyGroup.scale.setScalar(factor));
  }

  function setLight(on) {
    lightOn = on;
    hudLight.textContent = on ? 'ON' : 'OFF';
    fairies.forEach((fairy) => {
      if (on) {
        fairy.state = 'FOLLOWING';
        fairy.behavior = 'approach';
        fairy.landed = false;
      } else {
        fairy.state = 'SEARCHING';
        fairy.searchTimer = 1.0;
      }
    });
  }

  function updateFairy(fairy, dt, t, isLead) {
    let target = fairy.waypoint;
    let maxSpeed = fairy.maxSpeedRoam;

    const orbSpeed = orbPos.distanceTo(fairy.lastOrbPos) / Math.max(dt, 0.0001);
    fairy.lastOrbPos.copy(orbPos);
    if (orbSpeed < 0.6) fairy.orbIdleTimer += dt; else fairy.orbIdleTimer = 0;

    if (fairy.state === 'FOLLOWING') {
      const distToOrb = fairy.pos.distanceTo(orbPos);
      if (distToOrb < 2.6 && fairy.orbIdleTimer > 0.8) fairy.behavior = 'orbit';
      else if (distToOrb > 3.6) fairy.behavior = 'approach';

      if (fairy.behavior === 'orbit') {
        const ang = t * 0.9 + fairy.hairSwayPhase;
        target = orbPos.clone().add(new THREE.Vector3(Math.cos(ang) * 1.5, Math.sin(ang * 1.4) * 0.5 + 0.2, Math.sin(ang) * 1.5));
        maxSpeed = 1.6;
        if (isLead) hudState.textContent = 'ORBITING';

        fairy.castCooldown -= dt;
        if (fairy.castCooldown <= 0) {
          fairy.castCooldown = rand(4, 8);
          fairy.arms.forEach((a) => {
            const handWorld = new THREE.Vector3();
            a.hand.getWorldPosition(handWorld);
            for (let k = 0; k < 4; k++) sparklePool.spawn(handWorld, new THREE.Vector3(rand(-.15, .15), rand(0.05, 0.2), rand(-.15, .15)), rand(0.6, 1), rand(0.12, 0.2));
          });
          playChime();
        }
      } else {
        target = orbPos;
        maxSpeed = lerp(fairy.maxSpeedFollow * 0.5, fairy.maxSpeedFollow, clamp(distToOrb / 6, 0, 1));
        if (isLead) hudState.textContent = 'FOLLOWING';
      }

    } else if (fairy.state === 'SEARCHING') {
      fairy.searchTimer -= dt;
      maxSpeed = 0.3;
      target = fairy.pos.clone().addScaledVector(fairy.forward, 0.2);
      if (isLead) hudState.textContent = 'SEARCHING';
      if (fairy.searchTimer <= 0) { fairy.state = 'ROAM'; fairy.waypoint = randomWaypoint(); }

    } else {
      maxSpeed = fairy.maxSpeedRoam;
      if (fairy.landed) {
        if (isLead) hudState.textContent = 'RESTING';
        target = fairy.pos.clone();
        maxSpeed = 0.05;
        fairy.landTimer -= dt;
        if (fairy.landTimer <= 0) { fairy.landed = false; fairy.waypoint = randomWaypoint(); fairy.wanderCooldown = rand(3, 6); }
      } else if (fairy.danceTimer > 0) {
        if (isLead) hudState.textContent = 'DANCING';
        fairy.danceTimer -= dt;
        target = fairy.pos.clone().add(new THREE.Vector3(Math.sin(t * 6) * 0.6, Math.cos(t * 5) * 0.4, Math.cos(t * 6) * 0.6));
        maxSpeed = 1.4;
        if (fairy.danceTimer <= 0) fairy.waypoint = randomWaypoint();
      } else {
        if (isLead) hudState.textContent = 'ROAMING';
        target = fairy.waypoint;
        if (fairy.pos.distanceTo(fairy.waypoint) < 0.8) {
          fairy.wanderCooldown -= dt;
          if (fairy.wanderCooldown <= 0) {
            const roll = Math.random();
            if (roll < 0.3) { fairy.landed = true; fairy.landTimer = rand(3, 6); fairy.waypoint = randomPerch(); }
            else if (roll < 0.55) { fairy.danceTimer = 1.6; playChime(); }
            else { fairy.waypoint = randomWaypoint(); fairy.wanderCooldown = rand(2, 5); }
          }
        } else if (fairy.landed === false && Math.random() < 0.002) {
          fairy.waypoint = randomPerch();
        }
      }
    }

    const spd = speedMultiplier;
    const desired = target.clone().sub(fairy.pos);
    if (desired.length() > 0.001) desired.normalize().multiplyScalar(maxSpeed * spd);
    const steer = desired.sub(fairy.vel).clampLength(0, fairy.maxForce * spd * dt);
    fairy.vel.add(steer);
    if (fairy.vel.length() > maxSpeed * spd) fairy.vel.setLength(maxSpeed * spd);
    const bob = Math.sin(t * 1.6 + fairy.hairSwayPhase) * 0.15;
    fairy.pos.addScaledVector(fairy.vel, dt);
    fairy.fairyGroup.position.copy(fairy.pos);
    fairy.fairyGroup.position.y += bob * (fairy.landed ? 0.3 : 1);

    const speed = fairy.vel.length();
    if (speed > 0.03) {
      const newForward = fairy.vel.clone().normalize();
      const turnAmount = newForward.clone().sub(fairy.forward);
      fairy.forward.lerp(newForward, clamp(dt * 2.6, 0, 1)).normalize();
      fairy.bank = lerp(fairy.bank, clamp(-turnAmount.x * 2.2, -0.5, 0.5), clamp(dt * 2.5, 0, 1));
    } else {
      fairy.bank = lerp(fairy.bank, 0, dt * 2);
    }
    if (fairy.state === 'SEARCHING') fairy.forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(t * 2.4) * 0.03);

    const up = new THREE.Vector3(0, 1, 0);
    const lookTarget = fairy.pos.clone().add(fairy.forward);
    const m = new THREE.Matrix4().lookAt(fairy.pos, lookTarget, up);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    fairy.fairyGroup.quaternion.slerp(q, 0.5);
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), fairy.bank);
    fairy.fairyGroup.quaternion.multiply(rollQ);

    fairy.hairSwayPhase += dt * (1.2 + speed * 0.6);
    fairy.hairChains.forEach((chain) => {
      const rootWorld = fairy.fairyGroup.localToWorld(chain.rootOffset.clone());
      chain.points[0].copy(rootWorld);
      for (let i = 1; i < HAIR_LINKS; i++) {
        const prev = chain.points[i - 1], cur = chain.points[i];
        if (cur.lengthSq() === 0) cur.copy(prev);
        const dir = cur.clone().sub(prev);
        const d = dir.length() || 0.0001;
        dir.multiplyScalar(1 / d);
        const linkLen = 0.11 * FAIRY_SCALE;
        const sway = Math.sin(fairy.hairSwayPhase - i * 0.7 + chain.phase) * 0.03 * (i / HAIR_LINKS);
        const perp = new THREE.Vector3(-dir.z, 0.15, dir.x);
        cur.copy(prev).addScaledVector(dir, linkLen).addScaledVector(perp, sway - speed * 0.015);
      }
      chain.meshes.forEach((mm, i) => mm.position.copy(fairy.fairyGroup.worldToLocal(chain.points[i].clone())));
      for (let i = 0; i < chain.bones.length; i++) {
        const a = chain.points[i], b = chain.points[i + 1];
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const dir = b.clone().sub(a);
        const len = dir.length() || 0.0001;
        dir.multiplyScalar(1 / len);
        const bone = chain.bones[i];
        bone.position.copy(fairy.fairyGroup.worldToLocal(mid));
        const worldQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        bone.quaternion.copy(fairy.fairyGroup.quaternion.clone().invert().multiply(worldQuat));
        bone.scale.set(1, len / (fairy.fairyGroup.scale.y || 1), 1);
      }
    });

    fairy.blinkTimer -= dt;
    if (fairy.blinkTimer <= 0 && fairy.blinking <= 0) { fairy.blinking = 0.12; fairy.blinkTimer = rand(3, 6); }
    if (fairy.blinking > 0) fairy.blinking -= dt;
    const blinkTargetY = fairy.blinking > 0 ? 0.1 : 1;
    fairy.eyeMeshes.forEach((e) => { e.scale.y = lerp(e.scale.y, blinkTargetY, dt * 24); });

    const flapRate = (fairy.landed ? 0.6 : lerp(5, 11, clamp(speed / (fairy.maxSpeedFollow * spd), 0, 1))) * Math.max(spd, 0.6);
    fairy.flapPhase += dt * flapRate;
    fairy.wingPivots.forEach((w) => {
      const foldAmt = fairy.landed ? 0.85 : 0;
      const flap = Math.sin(fairy.flapPhase + w.phase * Math.PI) * (fairy.landed ? 0.08 : 0.5);
      w.pivot.rotation.z = (w.side > 0 ? -1 : 1) * (0.25 + flap + foldAmt * 0.9);
      w.pivot.rotation.y = w.side * foldAmt * 0.6;
      const hue = (0.55 + 0.15 * Math.sin(t * 0.15 + w.hueSeed * 6.28)) % 1;
      w.wing.material.color.setHSL(hue, 0.55, 0.72);
    });

    fairy.arms.forEach((a) => {
      const reach = fairy.behavior === 'orbit' && fairy.state === 'FOLLOWING' ? 1 : 0;
      a.shoulder.rotation.x = lerp(a.shoulder.rotation.x, reach * -1.1, dt * 2.5);
      a.shoulder.rotation.z = lerp(a.shoulder.rotation.z, a.restZ * (1 - reach * 0.6), dt * 2.5);
    });

    fairy.laughCooldown -= dt;
    if (fairy.laughCooldown <= 0) {
      fairy.laughCooldown = rand(7, 14);
      for (let k = 0; k < 6; k++) {
        sparklePool.spawn(fairy.pos.clone().add(new THREE.Vector3(rand(-.1, .1), rand(0, .2), rand(-.1, .1))),
          new THREE.Vector3(rand(-.3, .3), rand(0.1, 0.4), rand(-.3, .3)), rand(0.6, 1.1), rand(0.12, 0.22));
      }
      playChime();
      if (isLead) { camShakeTime = 0.15; camShakeMag = 0.02; }
    }

    if (speed > 0.5 && Math.random() < 0.6) {
      dustTrailPool.spawn(fairy.pos.clone(), fairy.vel.clone().multiplyScalar(-0.2), 0.9, rand(0.1, 0.18));
    }

    fairy.bodyHalo.material.opacity = 0.3 + Math.sin(t * 2.4 + fairy.hairSwayPhase) * 0.08;

    fairy.butterflies.forEach((b) => {
      const ang = t * b.speed + b.phase;
      b.sprite.position.set(
        fairy.pos.x + Math.cos(ang) * b.radius,
        fairy.pos.y + 0.3 + Math.sin(t * b.yFreq + b.phase) * 0.3,
        fairy.pos.z + Math.sin(ang) * b.radius
      );
    });
  }

  function updateAllFairies(dt, t) {
    fairies.forEach((f, i) => updateFairy(f, dt, t, i === 0));
    // the shared magical light follows whichever fairy is nearest the orb
    let nearest = fairies[0];
    let nearestD = Infinity;
    fairies.forEach((f) => {
      const d = f.pos.distanceTo(orbPos);
      if (d < nearestD) { nearestD = d; nearest = f; }
    });
    fairyLight.position.copy(nearest.pos);
    fairyLight.intensity = 1.0 + Math.sin(t * 2) * 0.15 + (nearest.behavior === 'orbit' ? 0.4 : 0);
  }

  function nearestFairyDist(pos) {
    let best = Infinity;
    fairies.forEach((f) => { const d = pos.distanceTo(f.pos); if (d < best) best = d; });
    return best;
  }

  /* ---------------------------------------------------------------
     ENVIRONMENT REACTIONS: crystals glow, fireflies gather, flowers bloom
  --------------------------------------------------------------- */
  function updateEnvironmentReactions(dt, t) {
    crystals.forEach((c) => {
      c.mesh.getWorldPosition(c.worldPos);
      const d = nearestFairyDist(c.worldPos);
      const boost = clamp(1 - d / 6, 0, 1);
      c.mesh.material.emissiveIntensity = lerp(0.9, 2.2, boost) + Math.sin(t * 2 + c.worldPos.x) * 0.08;
    });
    trees.forEach((tr) => {
      const worldPos = new THREE.Vector3();
      tr.group.getWorldPosition(worldPos);
      const d = nearestFairyDist(worldPos);
      if (d < 3.5) tr.wobble = Math.min(tr.wobble + dt * 1.5, 1);
      else tr.wobble = Math.max(tr.wobble - dt * 1, 0);
      tr.group.rotation.z = Math.sin(t * 2) * 0.025 * tr.wobble;
    });
    flowerSprites.forEach((f) => {
      const worldPos = new THREE.Vector3();
      f.sprite.getWorldPosition(worldPos);
      const d = nearestFairyDist(worldPos);
      f.bloom = d < 2.2 ? Math.min(f.bloom + dt * 2, 1) : Math.max(f.bloom - dt * 0.6, 0);
      f.sprite.scale.setScalar(f.baseScale * (1 + f.bloom * 1.4));
      f.sprite.material.opacity = f.baseOpacity + f.bloom * 0.4;
    });
    fireflies.forEach((f) => {
      const d = nearestFairyDist(f.sprite.position);
      const drift = new THREE.Vector3(
        Math.sin(t * 0.6 + f.phase), Math.cos(t * 0.5 + f.phase) * 0.6, Math.sin(t * 0.4 + f.phase * 1.3)
      ).multiplyScalar(0.35);
      f.sprite.position.copy(f.home).add(drift);
      if (d < 4) {
        let nearestPos = fairies[0].pos;
        let bestD = Infinity;
        fairies.forEach((fr) => { const dd = f.sprite.position.distanceTo(fr.pos); if (dd < bestD) { bestD = dd; nearestPos = fr.pos; } });
        const toward = nearestPos.clone().sub(f.sprite.position).normalize().multiplyScalar((4 - d) * 0.5);
        f.sprite.position.add(toward);
      }
    });
  }

  /* ---------------------------------------------------------------
     CAMERA CONTROLLER
  --------------------------------------------------------------- */
  function updateCamera(dt) {
    const parX = mouseNDC.x * 1.1;
    const parY = mouseNDC.y * 0.6;
    const dancing = fairies.some((f) => f.danceTimer > 0);
    const targetFov = dancing ? 56 : 52;
    camera.fov = lerp(camera.fov, targetFov, dt * 2);
    camera.updateProjectionMatrix();

    let shakeX = 0, shakeY = 0;
    if (camShakeTime > 0) {
      camShakeTime -= dt;
      shakeX = (Math.random() - 0.5) * camShakeMag;
      shakeY = (Math.random() - 0.5) * camShakeMag;
    }
    const targetPos = camBase.clone().add(new THREE.Vector3(parX + shakeX, parY + shakeY, 0));
    camera.position.lerp(targetPos, clamp(dt * 2.2, 0, 1));
    const avgPos = new THREE.Vector3();
    fairies.forEach((f) => avgPos.add(f.pos));
    avgPos.divideScalar(fairies.length);
    const lookAtPoint = orbPos.clone().lerp(avgPos, 0.3).multiplyScalar(0.15);
    camera.lookAt(lookAtPoint.x, lookAtPoint.y, 0);
  }

  /* ---------------------------------------------------------------
     INPUT: left click toggles the magic light
  --------------------------------------------------------------- */
  let started = false;
  window.addEventListener('mousedown', (e) => {
    if (!started || e.button !== 0) return;
    if (e.target.closest('#controls-panel')) return; // don't toggle the light when using the sliders
    setLight(!lightOn);
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  const introEl = document.getElementById('intro');
  document.getElementById('enter-btn').addEventListener('click', () => {
    initAudio();
    introEl.classList.add('hidden');
    started = true;
  });

  const fairyCountInput = document.getElementById('fairy-count');
  const fairyCountValue = document.getElementById('fairy-count-value');
  if (fairyCountInput) {
    fairyCountInput.addEventListener('input', () => {
      const n = parseInt(fairyCountInput.value, 10);
      fairyCountValue.textContent = n;
      setFairyCount(n);
    });
  }
  const fairySpeedInput = document.getElementById('fairy-speed');
  const fairySpeedValue = document.getElementById('fairy-speed-value');
  if (fairySpeedInput) {
    fairySpeedInput.addEventListener('input', () => {
      speedMultiplier = parseFloat(fairySpeedInput.value);
      fairySpeedValue.textContent = speedMultiplier.toFixed(1) + '×';
    });
  }

  /* ---------------------------------------------------------------
     MAIN LOOP
  --------------------------------------------------------------- */
  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    updateOrb(dt, t);
    updateAllFairies(dt, t);
    updateEnvironmentReactions(dt, t);
    updateCamera(dt);
    dustTrailPool.update(dt);
    sparklePool.update(dt);

    starField.mat.opacity = 0.7 + Math.sin(t * 0.6) * 0.15;
    aurora.material.opacity = 0.08 + Math.sin(t * 0.3) * 0.03;
    aurora.rotation.z = Math.sin(t * 0.05) * 0.05;
    debris.forEach((d) => {
      d.mesh.rotation.x += d.spin * dt;
      d.mesh.rotation.y += d.spin * dt * 0.7;
      d.mesh.position.y += Math.sin(t * 0.4 + d.driftPhase) * 0.002;
    });
    clouds.forEach((c) => {
      c.sprite.position.x += c.speed * dt;
      if (c.sprite.position.x > 30) c.sprite.position.x = -30;
    });

    renderer.render(scene, camera);
  }
  tick();

})();
