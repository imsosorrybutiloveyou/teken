import * as THREE from "three";
import { MOVES } from "./combat.js";
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#152333");
  scene.fog = new THREE.FogExp2("#152333", 0.027);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 120);
  camera.position.set(9, 6.8, 12);
  scene.add(new THREE.HemisphereLight("#bbdef4", "#262325", 2.4));
  const key = new THREE.DirectionalLight("#d7edf9", 3.3);
  key.position.set(-3, 12, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight("#86cafa", 2.6);
  rim.position.set(3, 5, -6);
  scene.add(rim);
  const warm = new THREE.PointLight("#ff8b53", 32, 22, 2);
  warm.position.set(-6, 4, -4);
  scene.add(warm);
  const mat = (color, metalness = 0.15, roughness = 0.65) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const dark = mat("#17202b", 0.65, 0.46),
    edge = mat("#343e4a", 0.7, 0.38),
    metal = mat("#687b8a", 0.75, 0.38);
  const glowMat = (color) =>
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 3,
      roughness: 0.3,
    });
  const cyan = glowMat("#78d9e9"),
    orange = glowMat("#eaa05c");
  function mesh(geometry, material, parent = scene, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(w, h, d, material, parent = scene, x = 0, y = 0, z = 0) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
  }
  function cylinder(
    r1,
    r2,
    h,
    material,
    parent = scene,
    x = 0,
    y = 0,
    z = 0,
    n = 64,
  ) {
    return mesh(
      new THREE.CylinderGeometry(r1, r2, h, n),
      material,
      parent,
      x,
      y,
      z,
    );
  }
  mesh(new THREE.PlaneGeometry(180, 180), mat("#0c151e"), scene).rotation.x =
    -Math.PI / 2;
  cylinder(6.6, 7, 0.45, dark, scene, 0, -0.23, 0, 8);
  cylinder(6.65, 6.65, 0.05, metal, scene, 0, -0.04, 0, 8);
  cylinder(6.5, 6.5, 0.055, mat("#293944", 0.6, 0.7), scene, 0, 0, 0, 8);
  function floorTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#34434a";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1024; i += 64) {
      ctx.strokeStyle = i % 256 === 0 ? "#526269" : "#3d4f57";
      ctx.lineWidth = i % 256 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }
    ctx.strokeStyle = "#a8bbc066";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(512, 512, 356, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.arc(512, 512, 365, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#d2e09a";
    ctx.lineWidth = 6;
    for (let a = 0; a < 8; a++) {
      ctx.save();
      ctx.translate(512, 512);
      ctx.rotate((a * Math.PI) / 4);
      ctx.beginPath();
      ctx.moveTo(390, -36);
      ctx.lineTo(390, 36);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(512, 512);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillStyle = "#8b9a9d40";
    ctx.font = "italic 900 135px sans-serif";
    ctx.fillText("AXIS", 0, 35);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#9eafb77a";
    ctx.fillText("S E C T O R   0 7", 0, 75);
    ctx.restore();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  const floor = mesh(
    new THREE.CircleGeometry(6.48, 8),
    new THREE.MeshStandardMaterial({
      map: floorTexture(),
      roughness: 0.82,
      metalness: 0.35,
    }),
    scene,
    0,
    0.034,
    0,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.rotation.z = Math.PI / 8;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * 6.3, 0, Math.sin(a) * 6.3);
    g.rotation.y = -a;
    scene.add(g);
    box(0.08, 0.055, 1.9, i % 2 ? orange : cyan, g, 0, 0.07, 0);
    box(0.25, 0.21, 2.2, dark, g, 0, -0.08, 0);
  }
  // Procedural architecture and all character geometry are original, with no external asset downloads.
  for (let i = 0; i < 30; i++) {
    const angle = i * 2.39996,
      r = 17 + (i % 4) * 5,
      h = 3 + ((i * 7) % 13);
    const x = Math.cos(angle) * r,
      z = Math.sin(angle) * r;
    const tower = new THREE.Group();
    tower.position.set(x, h / 2 - 1, z);
    scene.add(tower);
    box(2.2, h, 2.5, mat(i % 2 ? "#243443" : "#1d2e3b", 0.5, 0.6), tower);
    box(2.35, 0.15, 2.65, edge, tower, 0, h / 2, 0);
    for (let j = 0; j < h / 1.3; j++)
      box(
        1.4,
        0.055,
        0.02,
        i % 5 === 0 ? orange : cyan,
        tower,
        0,
        j * 1.3 - h / 2 + 0.7,
        1.26,
      );
  }
  for (const x of [-9, 9]) {
    const g = new THREE.Group();
    g.position.set(x, 0, -7);
    scene.add(g);
    box(0.6, 8, 0.6, dark, g, 0, 3, 0);
    box(0.09, 7, 0.1, cyan, g, 0.31, 3, 0.1);
    box(3.4, 2.05, 0.25, dark, g, 0, 6, 0);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#101e2b";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#aec7be";
    ctx.font = "italic 900 125px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AXIS", 256, 147);
    ctx.font = "18px monospace";
    ctx.fillStyle = "#d6f76b";
    ctx.fillText("THE NEXT DIMENSION", 256, 197);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const sign = mesh(
      new THREE.PlaneGeometry(3.1, 1.75),
      new THREE.MeshBasicMaterial({ map: t }),
      g,
      0,
      6,
      0.14,
    );
    sign.rotation.y = x < 0 ? 0.2 : -0.2;
  }
  const backRing = mesh(
    new THREE.TorusGeometry(13, 0.04, 6, 100),
    new THREE.MeshBasicMaterial({
      color: "#6d8d9e",
      transparent: true,
      opacity: 0.26,
    }),
    scene,
    0,
    3,
    -19,
  );
  backRing.rotation.x = 0.25;
  const starPositions = [];
  for (let i = 0; i < 140; i++)
    starPositions.push(
      Math.sin(i * 13) * 50,
      8 + (i % 19),
      -15 - Math.abs(Math.cos(i * 7) * 35),
    );
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starPositions, 3),
  );
  scene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: "#9fb4c4",
        size: 0.045,
        transparent: true,
        opacity: 0.5,
      }),
    ),
  );
  function makeFighter(index) {
    const group = new THREE.Group();
    scene.add(group);
    const body = new THREE.Group();
    group.add(body);
    const blue = index === 0,
      cloth = mat(blue ? "#316e98" : "#a94e3c", 0.25, 0.55),
      trim = mat(blue ? "#b3cdd2" : "#d2b18a", 0.35, 0.55),
      pants = mat(blue ? "#bac0ba" : "#303641", 0.13, 0.78),
      skin = mat(blue ? "#c49e80" : "#c7ad96", 0.08, 0.7),
      black = mat("#1b232e", 0.3, 0.6),
      hair = mat(blue ? "#18232e" : "#c8c6b9", 0.15, 0.85);
    const torso = box(0.7, 0.67, 0.39, cloth, body, 0, 1.38, 0);
    torso.geometry.translate(0, 0.02, 0);
    box(0.38, 0.6, 0.025, black, body, 0, 1.4, 0.21);
    box(0.09, 0.6, 0.045, trim, body, -0.24, 1.4, 0.23).rotation.z = -0.14;
    box(0.09, 0.6, 0.045, trim, body, 0.24, 1.4, 0.23).rotation.z = 0.14;
    box(0.74, 0.12, 0.43, black, body, 0, 1.08, 0);
    box(0.14, 0.14, 0.06, trim, body, 0, 1.09, 0.24);
    if (!blue) {
      const sash = box(0.16, 0.55, 0.06, cloth, body, 0.26, 0.85, 0.17);
      sash.rotation.z = -0.18;
    }
    cylinder(0.11, 0.13, 0.18, skin, body, 0, 1.83, 0, 8);
    const head = new THREE.Group();
    head.position.y = 2.03;
    body.add(head);
    mesh(
      new THREE.SphereGeometry(0.225, 12, 10),
      skin,
      head,
      0,
      0,
      0,
    ).scale.set(0.85, 1.14, 0.84);
    box(0.33, 0.16, 0.34, hair, head, 0, 0.19, -0.035);
    for (let n = 0; n < 6; n++) {
      const spike = mesh(
        new THREE.ConeGeometry(0.09, 0.23 + (n % 2) * 0.07, 4),
        hair,
        head,
        ((n % 3) - 1) * 0.105,
        0.3,
        -0.05 - Math.floor(n / 3) * 0.12,
      );
      spike.rotation.x = -0.25;
      spike.rotation.z = ((n % 3) - 1) * -0.2;
    }
    box(0.065, 0.025, 0.02, black, head, -0.085, 0.025, 0.18);
    box(0.065, 0.025, 0.02, black, head, 0.085, 0.025, 0.18);
    box(0.055, 0.065, 0.05, skin, head, 0, -0.02, 0.19);
    const arms = [];
    for (const s of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(s * 0.43, 1.7, 0);
      body.add(shoulder);
      mesh(new THREE.SphereGeometry(0.19, 10, 8), cloth, shoulder);
      cylinder(0.135, 0.12, 0.41, skin, shoulder, 0, -0.22, 0, 10);
      const elbow = new THREE.Group();
      elbow.position.y = -0.43;
      shoulder.add(elbow);
      mesh(new THREE.SphereGeometry(0.12, 10, 8), skin, elbow);
      cylinder(0.115, 0.135, 0.34, skin, elbow, 0, -0.18, 0, 10);
      cylinder(0.14, 0.14, 0.15, trim, elbow, 0, -0.33, 0, 10);
      const fist = box(
        0.26,
        0.25,
        0.25,
        blue ? black : cloth,
        elbow,
        0,
        -0.48,
        0,
      );
      box(0.22, 0.06, 0.27, trim, elbow, 0, -0.43, 0.01);
      arms.push({ shoulder, elbow, fist });
    }
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * 0.22, 1, 0);
      body.add(hip);
      cylinder(0.18, 0.15, 0.46, pants, hip, 0, -0.23, 0, 10);
      const knee = new THREE.Group();
      knee.position.y = -0.46;
      hip.add(knee);
      mesh(new THREE.SphereGeometry(0.16, 10, 8), black, knee, 0, 0, 0.025);
      cylinder(0.14, 0.11, 0.43, pants, knee, 0, -0.21, 0, 10);
      box(0.23, 0.21, 0.4, black, knee, 0, -0.43, 0.07);
      box(0.24, 0.065, 0.4, trim, knee, 0, -0.5, 0.07);
      legs.push({ hip, knee });
    }
    const shadow = mesh(
      new THREE.CircleGeometry(0.62, 32),
      new THREE.MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
      scene,
      0,
      0.041,
      0,
    );
    shadow.rotation.x = -Math.PI / 2;
    const ring = mesh(
      new THREE.RingGeometry(0.56, 0.58, 48),
      new THREE.MeshBasicMaterial({
        color: blue ? "#8ed5fb" : "#ed9673",
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
      scene,
      0,
      0.045,
      0,
    );
    ring.rotation.x = -Math.PI / 2;
    return {
      group,
      body,
      torso,
      head,
      arms,
      legs,
      shadow,
      ring,
      materials: [cloth, skin],
    };
  }
  const rigs = [makeFighter(0), makeFighter(1)];
  const effects = [];
  let shake = 0,
    cameraMode = 0;
  function spark(event) {
    const group = new THREE.Group();
    group.position.set(event.x, event.y, event.z);
    scene.add(group);
    const blocked = event.type === "block";
    const color = blocked ? "#9fdbef" : "#fbd397";
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        spike = mesh(
          new THREE.BoxGeometry(0.025, 0.025, 0.15 + (i % 3) * 0.08),
          new THREE.MeshBasicMaterial({ color, transparent: true }),
          group,
        );
      spike.rotation.set(Math.sin(a) * 2, a, Math.cos(a));
      spike.userData.dir = new THREE.Vector3(
        Math.cos(a) * 0.7,
        Math.sin(a) * 0.7,
        Math.sin(i * 2) * 0.5,
      );
    }
    effects.push({ group, age: 0, blocked });
    if (!blocked) shake = 0.1;
  }
  function pose(r, f, t, dt) {
    r.group.position.lerp(
      new THREE.Vector3(f.x, f.y + 0.04, f.z),
      Math.min(1, dt * 22),
    );
    const desired = Math.PI / 2 - f.angle;
    let diff =
      ((desired - r.group.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    r.group.rotation.y += diff * Math.min(1, dt * 16);
    const walk = Math.sin(t * 13) * f.move,
      bob = Math.sin(t * 4) * 0.015;
    const crouch = f.crouch ? 0.34 : 0;
    r.body.position.y = bob - crouch;
    r.body.rotation.set(0, 0, f.stun > 0 ? -0.1 : 0);
    r.head.rotation.x = 0;
    r.arms.forEach(({ shoulder, elbow }, i) => {
      shoulder.rotation.set(-0.65 + (i ? -0.15 : 0.05), 0, i ? -0.16 : 0.16);
      elbow.rotation.set(-1.45, 0, 0);
    });
    r.legs.forEach(({ hip, knee }, i) => {
      hip.rotation.set(
        (i ? -0.12 : 0.12) + walk * (i ? -0.42 : 0.42) - (f.crouch ? 0.6 : 0),
        0,
        i ? 0.1 : -0.1,
      );
      knee.rotation.x =
        0.14 + (f.crouch ? 1 : 0) + Math.max(0, walk * (i ? 0.5 : -0.5));
    });
    if (f.guard) {
      r.arms.forEach(({ shoulder, elbow }, i) => {
        shoulder.rotation.x = -1.08;
        shoulder.rotation.z = i ? -0.35 : 0.35;
        elbow.rotation.x = -1.6;
      });
      r.head.rotation.x = 0.12;
    }
    if (f.stun > 0 && !f.guard) {
      r.body.rotation.x = -0.15;
      r.arms.forEach(({ shoulder }) => (shoulder.rotation.z *= 3));
    }
    if (f.y > 0) {
      r.body.rotation.z = -0.2;
      r.legs[0].hip.rotation.x = -0.6;
      r.legs[1].hip.rotation.x = 0.5;
      r.legs.forEach(({ knee }) => (knee.rotation.x = 0.65));
    }
    if (f.attack) {
      const move = MOVES[f.attack.key],
        p = f.attack.t,
        extension =
          p < move.windup
            ? Math.sin(((p / move.windup) * Math.PI) / 2)
            : Math.max(
                0,
                1 - (p - move.windup) / (move.duration - move.windup),
              );
      const a = move.kind === "cross" ? r.arms[1] : r.arms[0];
      if (["punch", "cross"].includes(move.kind)) {
        a.shoulder.rotation.x = -0.65 - extension * 1.05;
        a.elbow.rotation.x = -1.45 + extension * 1.48;
        r.body.rotation.y = extension * (move.kind === "cross" ? -0.3 : 0.2);
      }
      if (move.kind === "upper") {
        a.shoulder.rotation.x = -0.65 - extension * 2.2;
        a.elbow.rotation.x = -0.8;
        r.body.position.y += extension * 0.15;
        r.body.rotation.x = -extension * 0.2;
      }
      if (["kick", "spin", "low"].includes(move.kind)) {
        const leg = r.legs[1];
        leg.hip.rotation.x = -extension * (move.kind === "low" ? 0.7 : 1.8);
        leg.hip.rotation.z = -extension * 0.3;
        leg.knee.rotation.x = 0.15;
        r.body.rotation.z = extension * 0.18;
        r.body.rotation.y =
          move.kind === "spin" ? extension * Math.PI * 0.85 : extension * 0.45;
      }
      if (move.kind === "throw") {
        r.arms.forEach(({ shoulder, elbow }) => {
          shoulder.rotation.x = -0.65 - extension * 1.1;
          elbow.rotation.x = -1.45 + extension * 1.1;
        });
        r.body.rotation.x = extension * 0.3;
      }
    } else r.body.rotation.y = 0;
    r.materials.forEach((m) => {
      m.emissive.set(f.hitFlash > 0 ? "#eab477" : "#000000");
      m.emissiveIntensity = f.hitFlash > 0 ? 0.8 : 0;
    });
    r.shadow.position.set(f.x, 0.042, f.z);
    r.shadow.scale.setScalar(1 - f.y * 0.14);
    r.shadow.material.opacity = 0.25 - f.y * 0.06;
    r.ring.position.set(f.x, 0.047, f.z);
  }
  const clock = new THREE.Clock();
  let resizeWidth = 0,
    resizeHeight = 0;
  return {
    render(match) {
      const dt = Math.min(clock.getDelta(), 0.05),
        t = clock.elapsedTime;
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      if (width !== resizeWidth || height !== resizeHeight) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        resizeWidth = width;
        resizeHeight = height;
      }
      match.fighters.forEach((f, i) => pose(rigs[i], f, t, dt));
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.age += dt;
        e.group.children.forEach((s) => {
          s.position.addScaledVector(s.userData.dir, dt * 4);
          s.material.opacity = Math.max(0, 1 - e.age * 4);
        });
        if (e.age > 0.3) {
          scene.remove(e.group);
          e.group.children.forEach((s) => {
            s.geometry.dispose();
            s.material.dispose();
          });
          effects.splice(i, 1);
        }
      }
      const [a, b] = match.fighters,
        mid = new THREE.Vector3((a.x + b.x) / 2, 0.85, (a.z + b.z) / 2),
        dist = Math.hypot(a.x - b.x, a.z - b.z),
        zoom = Math.max(1, (dist + 5) / 9),
        mobile = camera.aspect < 1.2;
      const target =
        cameraMode === 0
          ? new THREE.Vector3(
              mid.x + 2.4 * zoom,
              4.6 * zoom,
              mid.z + 10.2 * zoom,
            )
          : new THREE.Vector3(
              mid.x + 8.7 * zoom,
              8.6 * zoom,
              mid.z + 8.7 * zoom,
            );
      if (mobile) target.multiplyScalar(1.25);
      camera.position.lerp(target, dt * 2.5);
      shake = Math.max(0, shake - dt);
      camera.lookAt(mid.x + (Math.random() - 0.5) * shake, mid.y, mid.z);
      renderer.render(scene, camera);
    },
    event: spark,
    toggleCamera() {
      cameraMode = 1 - cameraMode;
    },
    renderer,
    scene,
  };
}
