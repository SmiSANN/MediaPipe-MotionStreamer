import {
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

const videoElement = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById(
  "output_canvas"
) as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d")!;
const loadingElement = document.getElementById("loading") as HTMLElement;

// poseLandmarker用の変数を追加
let handLandmarker: HandLandmarker | undefined;
let poseLandmarker: PoseLandmarker | undefined;
let runningMode: "VIDEO" = "VIDEO";
let lastVideoTime = -1;
const drawingUtils = new DrawingUtils(canvasCtx);

// 両方のモデルを初期化する関数
async function createLandmarkers() {
  const vision = await FilesetResolver.forVisionTasks("/wasm/");

  // HandLandmarkerの作成
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: runningMode,
    numHands: 2,
  });

  // PoseLandmarkerの作成
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `/pose_landmarker_heavy.task`, // heavyモデルを指定
      delegate: "GPU",
    },
    runningMode: runningMode,
    minPoseDetectionConfidence: 0.85   ,
    numPoses: 1,
  });

  loadingElement.style.display = "none";
  enableCam();
}

// カメラを有効化する関数
async function enableCam() {
  if (!handLandmarker || !poseLandmarker) {
    console.warn("Landmarkerがまだ読み込まれていません");
    return;
  }
  const constraints = {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoElement.srcObject = stream;
  videoElement.addEventListener("loadeddata", () => {
    console.log(
      `カメラの解像度: ${videoElement.videoWidth} x ${videoElement.videoHeight}`
    );
    predictWebcam();
  });
}

// Webカメラ映像から検出するループ
async function predictWebcam() {
  if (!videoElement.srcObject) return;

  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  let startTimeMs = performance.now();
  if (lastVideoTime !== videoElement.currentTime) {
    lastVideoTime = videoElement.currentTime;

    // 両方のモデルで検出を実行
    const handDetections = handLandmarker?.detectForVideo(
      videoElement,
      startTimeMs
    );
    const poseDetections = poseLandmarker?.detectForVideo(
      videoElement,
      startTimeMs
    );

    // キャンバスを一度クリア
    //canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 手のランドマークを描画
    if (handDetections?.landmarks) {
      for (const landmarks of handDetections.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          HandLandmarker.HAND_CONNECTIONS,
          { color: "#00FF00", lineWidth: 5 }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });
      }
    }

    // 姿勢のランドマークを描画
    if (poseDetections?.landmarks) {
      for (const landmarks of poseDetections.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          PoseLandmarker.POSE_CONNECTIONS,
          { color: "#00B6FF", lineWidth: 5 }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FFB600",
          lineWidth: 2,
        });
      }
    }
  }

  window.requestAnimationFrame(predictWebcam);
}

// アプリケーション開始時に両方のモデルを初期化
createLandmarkers();
