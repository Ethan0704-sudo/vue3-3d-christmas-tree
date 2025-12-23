<template>
  <div class="christmas-scene" ref="containerRef">
    <!-- 子组件集成 -->
    <Loader
      v-if="isLoading"
      :loadingText="loadingText"
      :showEnterBtn="showEnterBtn"
      @enter="enterExperience"
    />

    <AppTitle v-if="!uiHidden" />

    <StatusPanel v-if="!uiHidden" :gestureEnabled="state.gestureEnabled" />

    <ControlBar
      v-if="!uiHidden"
      :gestureEnabled="state.gestureEnabled"
      @upload-photo="triggerPhotoUpload"
      @upload-bg="triggerBgUpload"
      @toggle-gesture="toggleGesture"
      @show-blessing="showBlessing"
      @reset-view="resetView"
      @open-theme="openThemeOverlay"
    />

    <MusicPlayer
      ref="musicPlayerRef"
      src="https://image2url.com/audio/1766462799303-ef95bf8e-4112-458f-91c6-1be8f15a9a78.mp3"
    />

    <ThemePalette
      :isOpen="activeOverlay === 'theme'"
      :currentTheme="currentTheme"
      @close="closeOverlay"
      @select-theme="setTheme"
    />

    <BlessingModal
      :isOpen="activeOverlay === 'blessing'"
      :text="currentBlessing"
      @close="closeOverlay"
    />

    <!-- 虚拟手势光标 (逻辑与 3D 强绑定，暂留此处) -->
    <div id="hand-cursor" ref="cursorRef"></div>

    <!-- 隐藏的文件输入框 -->
    <input
      type="file"
      ref="photoInputRef"
      accept="image/*"
      multiple
      style="display: none"
      @change="handlePhotoUpload"
    />
    <input
      type="file"
      ref="bgInputRef"
      accept="image/*"
      multiple
      style="display: none"
      @change="handleBgUpload"
    />

    <!-- 视觉识别视频流容器 -->
    <div id="webcam-container">
      <video ref="videoRef" autoplay playsinline></video>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, reactive } from "vue";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

// 引入子组件 (修正路径为 ../components)
import Loader from "../components/Loader.vue";
import AppTitle from "../components/AppTitle.vue";
import StatusPanel from "../components/StatusPanel.vue";
import ControlBar from "../components/ControlBar.vue";
import MusicPlayer from "../components/MusicPlayer.vue";
import ThemePalette from "../components/ThemePalette.vue";
import BlessingModal from "../components/BlessingModal.vue";

// --- 配置常量 ---
const CONFIG = {
  foliageCount: 5000,
  snowCount: 1500,
  ornamentCount: 120,
  modes: { TREE: "TREE", SCATTER: "SCATTER", FOCUS: "FOCUS" },
  themes: {
    classic: {
      green: 0x0f3315,
      ornament1: 0xffd700,
      ornament2: 0xcc0000,
      light: 0xffaa33,
    },
    frozen: {
      green: 0xaaddff,
      ornament1: 0xc0c0c0,
      ornament2: 0x00ffff,
      light: 0x88ccff,
    },
    midnight: {
      green: 0x050505,
      ornament1: 0xd4af37,
      ornament2: 0x333333,
      light: 0xffd700,
    },
  },
  blessings: [
    "愿你的圣诞节闪耀着金色的光芒。",
    "Merry Christmas, may peace be with you.",
    "在这寒冷的冬夜，愿爱温暖你的心。",
    "繁星闪烁，为你许下最美好的愿望。",
    "Joyeux Noël! 愿幸福如雪花般降临。",
    "愿你的新年充满希望与奇迹。",
    "祝你平安喜乐，万事胜意。",
    "把所有的好运都装进袜子里送给你。",
  ],
};

// --- Vue 响应式状态 ---
const containerRef = ref(null);
const videoRef = ref(null);
const cursorRef = ref(null);
const photoInputRef = ref(null);
const bgInputRef = ref(null);
const musicPlayerRef = ref(null);

const isLoading = ref(true);
const loadingText = ref("正在加载节日魔法...");
const showEnterBtn = ref(false);
const uiHidden = ref(false);
const activeOverlay = ref(null);
const currentTheme = ref("classic");
const currentBlessing = ref("");

// 内部逻辑状态 (Non-reactive for performance)
const state = reactive({
  mode: CONFIG.modes.TREE,
  targetRotation: { x: 0, y: 0 },
  focusTarget: null,
  gestureEnabled: false,
  isVisionReady: false,
  hoveredPhoto: null,
});

// Three.js 变量
let camera, scene, renderer, composer, controls;
let mainGroup, bgGroup;
let foliageMesh, snowSystem;
let lights = {};
let clock = new THREE.Clock();
let animationId = null;

// 数据存储
let foliageData = [];
const dummy = new THREE.Object3D();
const decorations = [];
const bgPlanes = [];
const raycaster = new THREE.Raycaster();
const handPointer = new THREE.Vector2();

// MediaPipe 变量
let handLandmarker;
let lastVideoTime = -1;

// --- 纹理工厂 ---
const TextureFactory = {
  createCandyCane: () => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#722f37";
    ctx.lineWidth = 30;
    ctx.beginPath();
    for (let i = -128; i < 256; i += 40) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
    }
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  },
  createGift: () => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#722f37";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(54, 0, 20, 128);
    ctx.fillRect(0, 54, 128, 20);
    return new THREE.CanvasTexture(c);
  },
  createText: (text) => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(20,20,20,0.9)";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.font = 'bold 50px "Cinzel"';
    ctx.fillStyle = "#d4af37";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  },
};

// --- 初始化逻辑 ---
onMounted(() => {
  initThree();

  setTimeout(() => {
    loadingText.value = "魔法已准备就绪";
    showEnterBtn.value = true;
  }, 1000);

  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", onWindowResize);
});

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("resize", onWindowResize);
  if (renderer) renderer.dispose();
  if (handLandmarker) handLandmarker.close();
});

const enterExperience = () => {
  if (musicPlayerRef.value) {
    musicPlayerRef.value.play();
  }
  isLoading.value = false;
  animate();
};

function initThree() {
  const container = containerRef.value;
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    logarithmicDepthBuffer: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environmentIntensity = 1.5;
  scene.fog = new THREE.FogExp2(0x050505, 0.012);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 5, 50);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.maxDistance = 80;

  mainGroup = new THREE.Group();
  scene.add(mainGroup);
  bgGroup = new THREE.Group();
  scene.add(bgGroup);

  setupLighting();
  setupBackgroundPlanes();
  createFoliageInstanced();
  createDecorations();
  createSnow();
  setupPostProcessing();
}

function setupLighting() {
  const topSpot = new THREE.SpotLight(0xfffaed, 2000);
  topSpot.position.set(0, 50, 0);
  topSpot.angle = 0.3;
  topSpot.penumbra = 0.5;
  topSpot.castShadow = true;
  scene.add(topSpot);
  lights.top = topSpot;

  const keyLight = new THREE.SpotLight(CONFIG.themes.classic.light, 1000);
  keyLight.position.set(30, 20, 30);
  keyLight.angle = 0.6;
  keyLight.castShadow = true;
  scene.add(keyLight);
  lights.key = keyLight;

  const rimLight = new THREE.SpotLight(0x4455ff, 800);
  rimLight.position.set(-30, 10, -30);
  scene.add(rimLight);
  lights.rim = rimLight;

  const fillLight = new THREE.PointLight(CONFIG.themes.classic.light, 5, 20);
  fillLight.position.set(0, 5, 0);
  mainGroup.add(fillLight);
  lights.fill = fillLight;
}

function setupBackgroundPlanes() {
  const geo = new THREE.PlaneGeometry(35, 25);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x111111,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  [
    { x: -25, z: -20, r: Math.PI / 6 },
    { x: -10, z: -30, r: Math.PI / 12 },
    { x: 10, z: -30, r: -Math.PI / 12 },
    { x: 25, z: -20, r: -Math.PI / 6 },
  ].forEach((p, i) => {
    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.position.set(p.x, 8, p.z);
    mesh.rotation.y = p.r;
    bgGroup.add(mesh);
    bgPlanes.push(mesh);
  });
}

function createFoliageInstanced() {
  const geometry = new THREE.TetrahedronGeometry(0.4, 0);
  const material = new THREE.MeshPhysicalMaterial({
    color: CONFIG.themes.classic.green,
    roughness: 0.4,
    metalness: 0.1,
    clearcoat: 0.5,
    flatShading: true,
  });
  foliageMesh = new THREE.InstancedMesh(
    geometry,
    material,
    CONFIG.foliageCount
  );
  foliageMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  for (let i = 0; i < CONFIG.foliageCount; i++) {
    const ratio = i / CONFIG.foliageCount;
    const h = 16 - ratio * 32;
    const radiusAtH = ((16 - h) / 32) * 14;
    const r = radiusAtH * (0.4 + Math.random() * 0.6);
    const angle = ratio * 150 + Math.random() * Math.PI * 2;
    const treePos = new THREE.Vector3(
      Math.cos(angle) * r,
      h,
      Math.sin(angle) * r
    );
    const treeRot = new THREE.Euler(-0.5, -angle, Math.random());

    const phi = Math.acos(-1 + (2 * i) / CONFIG.foliageCount);
    const theta = Math.sqrt(CONFIG.foliageCount * Math.PI) * phi;
    const scatterR = 20 + Math.random() * 15;
    const scatterPos = new THREE.Vector3().setFromSphericalCoords(
      scatterR,
      phi,
      theta
    );

    foliageData.push({
      treePos,
      treeRot,
      scatterPos,
      currentPos: treePos.clone(),
      currentRot: treeRot.clone(),
      scale: 0.5 + Math.random() * 0.8,
    });
    dummy.position.copy(treePos);
    dummy.rotation.copy(treeRot);
    dummy.scale.setScalar(foliageData[i].scale);
    dummy.updateMatrix();
    foliageMesh.setMatrixAt(i, dummy.matrix);
  }
  mainGroup.add(foliageMesh);
}

function createDecorations() {
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.5, 0),
    new THREE.MeshBasicMaterial({ color: 0xffffee })
  );
  star.position.set(0, 16.5, 0);
  star.add(new THREE.PointLight(0xffffee, 5, 10));
  mainGroup.add(star);
  decorations.push({
    mesh: star,
    type: "STAR",
    basePos: new THREE.Vector3(0, 16.5, 0),
  });

  const sphereGeo = new THREE.SphereGeometry(0.35, 32, 32);
  for (let i = 0; i < CONFIG.ornamentCount; i++) {
    const t = i / CONFIG.ornamentCount;
    const h = 15 - t * 30;
    const r = ((16 - h) / 32) * 15 + 0.5;
    const angle = t * 20;
    const mesh = new THREE.Mesh(
      sphereGeo,
      new THREE.MeshPhysicalMaterial({
        color:
          i % 2 === 0
            ? CONFIG.themes.classic.ornament1
            : CONFIG.themes.classic.ornament2,
        metalness: 1.0,
        roughness: 0.1,
      })
    );
    const pos = new THREE.Vector3(Math.cos(angle) * r, h, Math.sin(angle) * r);
    mesh.position.copy(pos);
    mainGroup.add(mesh);
    decorations.push({ mesh: mesh, type: "ORNAMENT", basePos: pos.clone() });
  }

  const giftGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  const giftMat = new THREE.MeshStandardMaterial({
    map: TextureFactory.createGift(),
  });
  [
    new THREE.Vector3(4, -8, 5),
    new THREE.Vector3(-5, -5, 4),
    new THREE.Vector3(0, -10, -6),
  ].forEach((pos) => {
    const mesh = new THREE.Mesh(giftGeo, giftMat);
    mesh.position.copy(pos);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    mainGroup.add(mesh);
    decorations.push({ mesh, type: "GIFT", basePos: pos.clone() });
  });

  const caneCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 2, 0),
    new THREE.Vector3(0.5, 2.5, 0),
    new THREE.Vector3(1, 2.2, 0),
  ]);
  const caneGeo = new THREE.TubeGeometry(caneCurve, 20, 0.15, 8, false);
  const caneMat = new THREE.MeshStandardMaterial({
    map: TextureFactory.createCandyCane(),
  });
  [new THREE.Vector3(-3, 2, 5), new THREE.Vector3(3, 5, -3)].forEach((pos) => {
    const mesh = new THREE.Mesh(caneGeo, caneMat);
    mesh.position.copy(pos);
    mesh.rotation.z = Math.PI;
    mainGroup.add(mesh);
    decorations.push({ mesh, type: "CANE", basePos: pos.clone() });
  });

  addPhoto(TextureFactory.createText("Merry Christmas"));
}

function createSnow() {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < CONFIG.snowCount; i++)
    pos.push(
      (Math.random() - 0.5) * 100,
      Math.random() * 60 - 20,
      (Math.random() - 0.5) * 100
    );
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.3,
    transparent: true,
    map: new THREE.CanvasTexture(c),
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  snowSystem = new THREE.Points(geo, mat);
  scene.add(snowSystem);
}

function setupPostProcessing() {
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.0,
    0.4,
    0.85
  );
  const outputPass = new OutputPass();
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
}

// --- UI Actions ---
const triggerPhotoUpload = () => photoInputRef.value.click();
const triggerBgUpload = () => bgInputRef.value.click();

const handlePhotoUpload = (e) => {
  Array.from(e.target.files)
    .slice(0, 50)
    .forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        new THREE.TextureLoader().load(ev.target.result, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          addPhoto(t);
        });
      reader.readAsDataURL(f);
    });
};

const handleBgUpload = (e) => {
  Array.from(e.target.files)
    .slice(0, 4)
    .forEach((f, i) => {
      if (bgPlanes[i]) {
        const r = new FileReader();
        r.onload = (ev) =>
          new THREE.TextureLoader().load(ev.target.result, (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            bgPlanes[i].material.map = t;
            bgPlanes[i].material.opacity = 0.9;
            bgPlanes[i].material.needsUpdate = true;
          });
        r.readAsDataURL(f);
      }
    });
};

const addPhoto = (texture) => {
  const photoIndex = decorations.filter((d) => d.type === "PHOTO").length;
  const group = new THREE.Group();
  const img = texture.image;
  const aspect = img ? img.width / img.height : 1.5;
  const pw = 3.0;
  const ph = pw / aspect;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(pw + 0.4, ph + 1.2, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  );
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(pw, ph),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  photo.position.set(0, 0.3, 0.04);
  group.add(frame);
  group.add(photo);

  frame.userData.parentGroup = group;
  photo.userData.parentGroup = group;
  group.userData.isPhoto = true;
  mainGroup.add(group);
  decorations.push({
    mesh: group,
    type: "PHOTO",
    photoIndex: photoIndex,
    basePos: new THREE.Vector3(),
  });
};

const resetView = () => window.resetCamera();
const openThemeOverlay = () => (activeOverlay.value = "theme");
const closeOverlay = () => (activeOverlay.value = null);

const showBlessing = () => {
  currentBlessing.value =
    CONFIG.blessings[Math.floor(Math.random() * CONFIG.blessings.length)];
  activeOverlay.value = "blessing";
};

const setTheme = (themeName) => {
  const t = CONFIG.themes[themeName];
  if (!t) return;
  currentTheme.value = themeName;
  foliageMesh.material.color.setHex(t.green);
  lights.key.color.setHex(t.light);
  lights.fill.color.setHex(t.light);
  decorations.forEach((d, i) => {
    if (d.type === "ORNAMENT")
      d.mesh.material.color.setHex(i % 2 === 0 ? t.ornament1 : t.ornament2);
  });
};

const toggleGesture = async () => {
  if (!state.isVisionReady) {
    await initMediaPipe();
    if (state.isVisionReady) {
      state.gestureEnabled = true;
      if (cursorRef.value) cursorRef.value.style.display = "block";
    }
  } else {
    state.gestureEnabled = !state.gestureEnabled;
    if (cursorRef.value)
      cursorRef.value.style.display = state.gestureEnabled ? "block" : "none";
  }
};

const handleKeydown = (e) => {
  if (e.key.toLowerCase() === "h") uiHidden.value = !uiHidden.value;
};
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
};

// --- Animation Loop ---
function animate() {
  animationId = requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  controls.update();

  // Foliage
  for (let i = 0; i < CONFIG.foliageCount; i++) {
    const d = foliageData[i];
    let targetPos =
      state.mode === CONFIG.modes.SCATTER || state.mode === CONFIG.modes.FOCUS
        ? d.scatterPos
        : d.treePos;
    d.currentPos.lerp(targetPos, 0.05);
    dummy.position.copy(d.currentPos);
    if (state.mode === CONFIG.modes.TREE) {
      dummy.rotation.x = d.treeRot.x + Math.sin(time + i) * 0.05;
      dummy.rotation.y = d.treeRot.y;
      dummy.rotation.z = d.treeRot.z;
    } else {
      d.currentRot.x += 0.01;
      d.currentRot.y += 0.01;
      dummy.rotation.copy(d.currentRot);
    }
    dummy.scale.setScalar(d.scale);
    dummy.updateMatrix();
    foliageMesh.setMatrixAt(i, dummy.matrix);
  }
  foliageMesh.instanceMatrix.needsUpdate = true;

  // Decorations
  const totalPhotos = Math.max(
    decorations.filter((d) => d.type === "PHOTO").length,
    12
  );
  decorations.forEach((d) => {
    let tPos = d.basePos.clone();
    let tScale = 1.0;
    if (d.type === "PHOTO") {
      if (state.mode === CONFIG.modes.TREE) {
        const idx = d.photoIndex;
        const r = idx / totalPhotos;
        const h = -15 + r * 28;
        const rad = ((16 - h) / 32) * 14 + 4.0;
        const angle = r * Math.PI * 7;
        tPos.set(Math.cos(angle) * rad, h, Math.sin(angle) * rad);
        d.mesh.position.lerp(tPos, 0.05);
        d.mesh.lookAt(tPos.clone().multiplyScalar(2));
      } else if (state.mode === CONFIG.modes.SCATTER) {
        const angle = (d.photoIndex / totalPhotos) * Math.PI * 2;
        tPos.set(
          Math.cos(angle) * 25,
          Math.sin(angle * 3) * 8,
          Math.sin(angle) * 25
        );
        tPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), mainGroup.rotation.y);
        d.mesh.position.lerp(tPos, 0.05);
        d.mesh.lookAt(camera.position);
        const dist = d.mesh.position.distanceTo(camera.position);
        tScale = THREE.MathUtils.clamp(40 / dist, 0.6, 1.8);
      } else if (state.mode === CONFIG.modes.FOCUS && d === state.focusTarget) {
        const worldTarget = camera.position
          .clone()
          .add(new THREE.Vector3(0, 0, -8).applyQuaternion(camera.quaternion));
        tPos = mainGroup.worldToLocal(worldTarget);
        d.mesh.position.lerp(tPos, 0.1);
        d.mesh.quaternion.copy(camera.quaternion);
        tScale = 1.2;
      }
    } else {
      if (state.mode === CONFIG.modes.SCATTER) {
        d.mesh.position.lerp(d.basePos.clone().multiplyScalar(2), 0.05);
        d.mesh.rotation.y += 0.02;
      } else {
        d.mesh.position.lerp(d.basePos, 0.05);
        if (d.type === "STAR") d.mesh.rotation.y = time * 0.5;
        if (d.type === "GIFT") d.mesh.rotation.y += 0.01;
      }
    }
    d.mesh.scale.setScalar(THREE.MathUtils.lerp(d.mesh.scale.x, tScale, 0.05));
  });

  // Snow
  const pos = snowSystem.geometry.attributes.position.array;
  for (let i = 1; i < pos.length; i += 3) {
    pos[i] -= 0.1;
    if (pos[i] < -20) pos[i] = 40;
  }
  snowSystem.geometry.attributes.position.needsUpdate = true;
  snowSystem.rotation.y = time * 0.05;

  // Rotation
  if (state.mode !== CONFIG.modes.FOCUS) {
    if (state.gestureEnabled) {
      mainGroup.rotation.y +=
        (state.targetRotation.y - mainGroup.rotation.y) * 0.05;
      mainGroup.rotation.x +=
        (state.targetRotation.x - mainGroup.rotation.x) * 0.05;
    } else mainGroup.rotation.y += 0.003;
  }

  // CV
  if (state.gestureEnabled && handLandmarker && videoRef.value) predictWebcam();
  composer.render();
}

// --- CV ---
async function initMediaPipe() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
  videoRef.value.srcObject = await navigator.mediaDevices.getUserMedia({
    video: true,
  });
  state.isVisionReady = true;
}
function predictWebcam() {
  let now = performance.now();
  if (videoRef.value.currentTime !== lastVideoTime) {
    lastVideoTime = videoRef.value.currentTime;
    const result = handLandmarker.detectForVideo(videoRef.value, now);
    if (result.landmarks.length > 0) {
      processGestures(result.landmarks[0]);
      const lm = result.landmarks[0][8];
      cursorRef.value.style.left = `${(1 - lm.x) * window.innerWidth}px`;
      cursorRef.value.style.top = `${lm.y * window.innerHeight}px`;
      handPointer.x = (1 - lm.x) * 2 - 1;
      handPointer.y = -(lm.y * 2) + 1;
      checkIntersection();
    } else cursorRef.value.style.display = "none";
  }
}
function checkIntersection() {
  raycaster.setFromCamera(handPointer, camera);
  const intersects = raycaster.intersectObjects(mainGroup.children, true);
  let found = null;
  for (let i = 0; i < intersects.length; i++) {
    let obj = intersects[i].object;
    while (obj.parent && obj.parent !== mainGroup) {
      if (obj.parent.userData.isPhoto) {
        found = obj.parent;
        break;
      }
      obj = obj.parent;
    }
    if (found) break;
  }
  if (found) {
    cursorRef.value.classList.add("hovering");
    state.hoveredPhoto = found;
  } else {
    cursorRef.value.classList.remove("hovering");
    state.hoveredPhoto = null;
  }
}
function processGestures(lm) {
  cursorRef.value.style.display = "block";
  const palm = lm[9];
  state.targetRotation.y = (0.5 - palm.x) * 3;
  state.targetRotation.x = (palm.y - 0.5) * 1;
  const thumb = lm[4],
    index = lm[8],
    wrist = lm[0];
  if (Math.hypot(thumb.x - index.x, thumb.y - index.y) < 0.05) {
    cursorRef.value.classList.add("pinching");
    if (state.hoveredPhoto) {
      const targetDeco = decorations.find((d) => d.mesh === state.hoveredPhoto);
      if (targetDeco) {
        state.focusTarget = targetDeco;
        state.mode = CONFIG.modes.FOCUS;
      }
    }
  } else {
    cursorRef.value.classList.remove("pinching");
    let tipDist = 0;
    [8, 12, 16, 20].forEach(
      (i) => (tipDist += Math.hypot(lm[i].x - wrist.x, lm[i].y - wrist.y))
    );
    if (tipDist / 4 < 0.2) state.mode = CONFIG.modes.TREE;
    else if (tipDist / 4 > 0.4) state.mode = CONFIG.modes.SCATTER;
  }
}
</script>

<style scoped>
/* 引入 Font Awesome 图标库 */
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css");

.christmas-scene {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-color: #050505;
  color: #d4af37;
  overflow: hidden;
  font-family: "Playfair Display", sans-serif;
}
#webcam-container {
  position: absolute;
  bottom: 0;
  right: 0;
  opacity: 0;
  pointer-events: none;
}
#hand-cursor {
  position: fixed;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  z-index: 2000;
  display: none;
}
#hand-cursor.pinching {
  background: rgba(212, 175, 55, 0.8);
  width: 15px;
  height: 15px;
  border-color: #d4af37;
}
#hand-cursor.hovering {
  border-color: #00ff00;
  box-shadow: 0 0 15px #00ff00;
}
</style>
