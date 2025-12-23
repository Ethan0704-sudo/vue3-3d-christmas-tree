import { ref } from "vue";
import * as THREE from "three";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { SceneMode, type DecorationData } from "../types";

interface GestureOptions {
  state: any; // Reactive state from scene
  camera: THREE.Camera;
  mainGroup: THREE.Group;
  decorations: DecorationData[];
}

export function useGestureControl() {
  const videoRef = ref<HTMLVideoElement | null>(null);
  const cursorRef = ref<HTMLElement | null>(null);
  const isVisionReady = ref(false);
  const gestureEnabled = ref(false);

  let handLandmarker: HandLandmarker | null = null;
  let lastVideoTime = -1;
  const raycaster = new THREE.Raycaster();
  const handPointer = new THREE.Vector2();

  const initMediaPipe = async () => {
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

    if (navigator.mediaDevices && videoRef.value) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.value.srcObject = stream;
      isVisionReady.value = true;
    }
  };

  const predictWebcam = (options: GestureOptions) => {
    if (!videoRef.value || !handLandmarker) return;

    const now = performance.now();
    if (videoRef.value.currentTime !== lastVideoTime) {
      lastVideoTime = videoRef.value.currentTime;
      const result = handLandmarker.detectForVideo(videoRef.value, now);

      if (result.landmarks.length > 0) {
        processGestures(result.landmarks[0], options);

        const lm = result.landmarks[0][8]; // Index finger tip
        if (cursorRef.value) {
          cursorRef.value.style.left = `${(1 - lm.x) * window.innerWidth}px`;
          cursorRef.value.style.top = `${lm.y * window.innerHeight}px`;
        }

        handPointer.x = (1 - lm.x) * 2 - 1;
        handPointer.y = -(lm.y * 2) + 1;
        checkIntersection(options);
      } else {
        if (cursorRef.value) cursorRef.value.style.display = "none";
      }
    }
  };

  const checkIntersection = ({ camera, mainGroup, state }: GestureOptions) => {
    raycaster.setFromCamera(handPointer, camera);
    const intersects = raycaster.intersectObjects(mainGroup.children, true);

    let found: THREE.Object3D | null = null;
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

    if (cursorRef.value) {
      if (found) {
        cursorRef.value.classList.add("hovering");
        state.hoveredPhoto = found;
      } else {
        cursorRef.value.classList.remove("hovering");
        state.hoveredPhoto = null;
      }
    }
  };

  const processGestures = (
    lm: any[],
    { state, decorations }: GestureOptions
  ) => {
    if (cursorRef.value) cursorRef.value.style.display = "block";

    // 1. Rotation (Palm)
    const palm = lm[9];
    state.targetRotation.y = (0.5 - palm.x) * 3;
    state.targetRotation.x = (palm.y - 0.5) * 1;

    // 2. Pinch (Selection)
    const thumb = lm[4],
      index = lm[8],
      wrist = lm[0];
    if (Math.hypot(thumb.x - index.x, thumb.y - index.y) < 0.05) {
      cursorRef.value?.classList.add("pinching");
      if (state.hoveredPhoto) {
        const targetDeco = decorations.find(
          (d) => d.mesh === state.hoveredPhoto
        );
        if (targetDeco) {
          state.focusTarget = targetDeco;
          state.mode = SceneMode.FOCUS;
        }
      }
    } else {
      cursorRef.value?.classList.remove("pinching");

      // 3. Fist / Open Hand (Mode Switch)
      let tipDist = 0;
      [8, 12, 16, 20].forEach(
        (i) => (tipDist += Math.hypot(lm[i].x - wrist.x, lm[i].y - wrist.y))
      );
      const avgDist = tipDist / 4;

      if (avgDist < 0.2) state.mode = SceneMode.TREE;
      else if (avgDist > 0.4) state.mode = SceneMode.SCATTER;
    }
  };

  return {
    videoRef,
    cursorRef,
    isVisionReady,
    gestureEnabled,
    initMediaPipe,
    predictWebcam,
  };
}
