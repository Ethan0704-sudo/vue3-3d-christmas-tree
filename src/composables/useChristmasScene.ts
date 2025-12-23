import { ref, reactive, onUnmounted, shallowRef, type Ref } from "vue";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { TextureFactory } from "../utils/TextureFactory";
import {
  SceneMode,
  type DecorationData,
  type FoliageData,
  type ThemeKey,
  type ThemeConfig,
} from "../types";

export const CONFIG = {
  foliageCount: 5000,
  snowCount: 1500,
  ornamentCount: 120,
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
  } as ThemeConfig,
};

export function useChristmasScene() {
  // State exposed to Vue
  const state = reactive({
    mode: SceneMode.TREE,
    targetRotation: { x: 0, y: 0 },
    focusTarget: null as DecorationData | null,
  });

  // Refs for DOM binding
  const containerRef = ref<HTMLElement | null>(null);

  // Three.js Objects (ShallowRef is better for performance with raw objects)
  const camera = shallowRef<THREE.PerspectiveCamera>();
  const mainGroup = shallowRef<THREE.Group>();

  // Private variables
  let scene: THREE.Scene;
  let renderer: THREE.WebGLRenderer;
  let composer: EffectComposer;
  let controls: OrbitControls;
  let foliageMesh: THREE.InstancedMesh;
  let snowSystem: THREE.Points;
  let lights: { [key: string]: THREE.Light } = {};
  let bgGroup: THREE.Group;

  const clock = new THREE.Clock();
  let animationId: number | null = null;

  const foliageData: FoliageData[] = [];
  const dummy = new THREE.Object3D();
  const decorations: DecorationData[] = [];
  const bgPlanes: THREE.Mesh[] = [];

  // --- Initialization ---
  const initScene = () => {
    if (!containerRef.value) return;

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.value.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environmentIntensity = 1.5;
    scene.fog = new THREE.FogExp2(0x050505, 0.012);

    const _camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    _camera.position.set(0, 5, 50);
    camera.value = _camera;

    controls = new OrbitControls(_camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.maxDistance = 80;

    const _mainGroup = new THREE.Group();
    scene.add(_mainGroup);
    mainGroup.value = _mainGroup;

    bgGroup = new THREE.Group();
    scene.add(bgGroup);

    setupLighting(scene, _mainGroup);
    setupBackgroundPlanes();
    createFoliageInstanced(_mainGroup);
    createDecorations(_mainGroup);
    createSnow(scene);
    setupPostProcessing(scene, _camera);

    window.addEventListener("resize", onWindowResize);
  };

  // --- Setup Helpers ---
  const setupLighting = (scene: THREE.Scene, group: THREE.Group) => {
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
    group.add(fillLight);
    lights.fill = fillLight;
  };

  const createFoliageInstanced = (group: THREE.Group) => {
    const geo = new THREE.TetrahedronGeometry(0.4, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: CONFIG.themes.classic.green,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.5,
      flatShading: true,
    });
    foliageMesh = new THREE.InstancedMesh(geo, mat, CONFIG.foliageCount);
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
    group.add(foliageMesh);
  };

  const createDecorations = (group: THREE.Group) => {
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.5, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffee })
    );
    star.position.set(0, 16.5, 0);
    star.add(new THREE.PointLight(0xffffee, 5, 10));
    group.add(star);
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
      const pos = new THREE.Vector3(
        Math.cos(angle) * r,
        h,
        Math.sin(angle) * r
      );
      mesh.position.copy(pos);
      group.add(mesh);
      decorations.push({ mesh: mesh, type: "ORNAMENT", basePos: pos.clone() });
    }

    // Gifts
    const giftMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.createGift(),
    });
    [
      new THREE.Vector3(4, -8, 5),
      new THREE.Vector3(-5, -5, 4),
      new THREE.Vector3(0, -10, -6),
    ].forEach((pos) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        giftMat
      );
      mesh.position.copy(pos);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(mesh);
      decorations.push({ mesh, type: "GIFT", basePos: pos.clone() });
    });

    // Canes
    const caneMat = new THREE.MeshStandardMaterial({
      map: TextureFactory.createCandyCane(),
    });
    const caneGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 2, 0),
        new THREE.Vector3(0.5, 2.5, 0),
        new THREE.Vector3(1, 2.2, 0),
      ]),
      20,
      0.15,
      8,
      false
    );
    [new THREE.Vector3(-3, 2, 5), new THREE.Vector3(3, 5, -3)].forEach(
      (pos) => {
        const mesh = new THREE.Mesh(caneGeo, caneMat);
        mesh.position.copy(pos);
        mesh.rotation.z = Math.PI;
        group.add(mesh);
        decorations.push({ mesh, type: "CANE", basePos: pos.clone() });
      }
    );

    addPhoto(TextureFactory.createText("Merry Christmas"));
  };

  const createSnow = (scene: THREE.Scene) => {
    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
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
    const ctx = c.getContext("2d")!;
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
  };

  const setupBackgroundPlanes = () => {
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
    ].forEach((p) => {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(p.x, 8, p.z);
      mesh.rotation.y = p.r;
      bgGroup.add(mesh);
      bgPlanes.push(mesh);
    });
  };

  const setupPostProcessing = (scene: THREE.Scene, camera: THREE.Camera) => {
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.0,
      0.4,
      0.85
    );
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  };

  // --- Public Methods ---
  const addPhoto = (texture: THREE.Texture) => {
    if (!mainGroup.value) return;
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
    mainGroup.value.add(group);
    decorations.push({
      mesh: group,
      type: "PHOTO",
      photoIndex: photoIndex,
      basePos: new THREE.Vector3(),
    });
  };

  const setTheme = (themeName: ThemeKey) => {
    const t = CONFIG.themes[themeName];
    if (!t) return;
    (foliageMesh.material as THREE.MeshPhysicalMaterial).color.setHex(t.green);
    (lights.key as THREE.Light).color.setHex(t.light);
    (lights.fill as THREE.Light).color.setHex(t.light);
    decorations.forEach((d, i) => {
      if (d.type === "ORNAMENT")
        (d.mesh as THREE.Mesh).material = new THREE.MeshPhysicalMaterial({
          color: i % 2 === 0 ? t.ornament1 : t.ornament2,
          metalness: 1.0,
          roughness: 0.1,
        });
    });
  };

  const resetView = () => {
    if (controls) controls.reset();
    if (camera.value) camera.value.position.set(0, 5, 50);
    if (state.mode === SceneMode.FOCUS) state.mode = SceneMode.SCATTER;
  };

  const onWindowResize = () => {
    if (camera.value && renderer) {
      camera.value.aspect = window.innerWidth / window.innerHeight;
      camera.value.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  };

  const captureScreenshot = (): string => {
    renderer.render(scene, camera.value!);
    return renderer.domElement.toDataURL("image/png");
  };

  // --- Animation Loop ---
  const animate = (customUpdate?: () => void) => {
    animationId = requestAnimationFrame(() => animate(customUpdate));
    if (customUpdate) customUpdate();

    const time = clock.getElapsedTime();
    if (controls) controls.update();

    // 1. Foliage
    for (let i = 0; i < CONFIG.foliageCount; i++) {
      const d = foliageData[i];
      let targetPos =
        state.mode === SceneMode.SCATTER || state.mode === SceneMode.FOCUS
          ? d.scatterPos
          : d.treePos;
      d.currentPos.lerp(targetPos, 0.05);
      dummy.position.copy(d.currentPos);
      if (state.mode === SceneMode.TREE) {
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

    // 2. Decorations
    const totalPhotos = Math.max(
      decorations.filter((d) => d.type === "PHOTO").length,
      12
    );
    decorations.forEach((d) => {
      let tPos = d.basePos.clone();
      let tScale = 1.0;
      if (d.type === "PHOTO") {
        if (state.mode === SceneMode.TREE) {
          const idx = d.photoIndex || 0;
          const r = idx / totalPhotos;
          const h = -15 + r * 28;
          const rad = ((16 - h) / 32) * 14 + 4.0;
          const angle = r * Math.PI * 7;
          tPos.set(Math.cos(angle) * rad, h, Math.sin(angle) * rad);
          d.mesh.position.lerp(tPos, 0.05);
          d.mesh.lookAt(tPos.clone().multiplyScalar(2));
        } else if (state.mode === SceneMode.SCATTER) {
          const idx = d.photoIndex || 0;
          const angle = (idx / totalPhotos) * Math.PI * 2;
          tPos.set(
            Math.cos(angle) * 25,
            Math.sin(angle * 3) * 8,
            Math.sin(angle) * 25
          );
          if (mainGroup.value)
            tPos.applyAxisAngle(
              new THREE.Vector3(0, 1, 0),
              mainGroup.value.rotation.y
            );
          d.mesh.position.lerp(tPos, 0.05);
          if (camera.value) d.mesh.lookAt(camera.value.position);
          if (camera.value) {
            const dist = d.mesh.position.distanceTo(camera.value.position);
            tScale = THREE.MathUtils.clamp(40 / dist, 0.6, 1.8);
          }
        } else if (
          state.mode === SceneMode.FOCUS &&
          d === state.focusTarget &&
          camera.value &&
          mainGroup.value
        ) {
          const worldTarget = camera.value.position
            .clone()
            .add(
              new THREE.Vector3(0, 0, -8).applyQuaternion(
                camera.value.quaternion
              )
            );
          tPos = mainGroup.value.worldToLocal(worldTarget);
          d.mesh.position.lerp(tPos, 0.1);
          d.mesh.quaternion.copy(camera.value.quaternion);
          tScale = 1.2;
        }
      } else {
        if (state.mode === SceneMode.SCATTER) {
          d.mesh.position.lerp(d.basePos.clone().multiplyScalar(2), 0.05);
          d.mesh.rotation.y += 0.02;
        } else {
          d.mesh.position.lerp(d.basePos, 0.05);
          if (d.type === "STAR") d.mesh.rotation.y = time * 0.5;
          if (d.type === "GIFT") d.mesh.rotation.y += 0.01;
        }
      }
      d.mesh.scale.setScalar(
        THREE.MathUtils.lerp(d.mesh.scale.x, tScale, 0.05)
      );
    });

    // 3. Snow
    const pos = snowSystem.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] -= 0.1;
      if (pos[i] < -20) pos[i] = 40;
    }
    snowSystem.geometry.attributes.position.needsUpdate = true;
    snowSystem.rotation.y = time * 0.05;

    // 4. Rotation
    if (state.mode !== SceneMode.FOCUS && mainGroup.value) {
      mainGroup.value.rotation.y +=
        (state.targetRotation.y - mainGroup.value.rotation.y) * 0.05 + 0.003;
      mainGroup.value.rotation.x +=
        (state.targetRotation.x - mainGroup.value.rotation.x) * 0.05;
    }

    if (composer) composer.render();
  };

  onUnmounted(() => {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener("resize", onWindowResize);
    renderer?.dispose();
  });

  return {
    containerRef,
    state,
    camera,
    mainGroup,
    decorations,
    bgPlanes,
    initScene,
    animate,
    addPhoto,
    setTheme,
    resetView,
    captureScreenshot,
  };
}
