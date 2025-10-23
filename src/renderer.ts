/**
 * renderer.ts
 * MediaPipe Hand & Pose Landmarker を使用したリアルタイム検出処理
 */

import {
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import {
  populateCameraSelect,
  setupCameraSelect,
  setupToggleButton,
  setupResolutionSelect,
} from "./ui";

// ============================================================================
// DOM要素の取得
// ============================================================================

const videoElement = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById(
  "output_canvas"
) as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d")!;
const loadingElement = document.getElementById("loading") as HTMLElement;

// ============================================================================
// グローバル変数
// ============================================================================

// MediaPipeのLandmarkerインスタンス
let handLandmarker: HandLandmarker | undefined;
let poseLandmarker: PoseLandmarker | undefined;

// 実行モード設定
const runningMode: "VIDEO" = "VIDEO";

// 描画ユーティリティ
const drawingUtils = new DrawingUtils(canvasCtx);

// 検出ループの状態管理
let isRunning = false;
let animationFrameId: number | null = null;
let lastVideoTime = -1;

// ============================================================================
// 初期化関数
// ============================================================================

/**
 * MediaPipe Landmarkerモデルを初期化する
 * - Hand Landmarker: 手の検出
 * - Pose Landmarker: 姿勢の検出
 */
async function createLandmarkers() {
  // MediaPipe Vision タスクの初期化
  const vision = await FilesetResolver.forVisionTasks("/wasm/");

  // Hand Landmarker の作成
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: runningMode,
    numHands: 2, // 最大2つの手を検出
  });

  // Pose Landmarker の作成
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `/pose_landmarker_heavy.task`,
      delegate: "GPU",
    },
    runningMode: runningMode,
    minPoseDetectionConfidence: 0.85,
    numPoses: 1, // 1人の姿勢を検出
  });

  // ローディング表示を非表示
  loadingElement.style.display = "none";

  // モデルの読み込み確認
  if (!handLandmarker || !poseLandmarker) {
    console.warn("Landmarkerがまだ読み込まれていません");
    return;
  }

  // UIの初期化
  await populateCameraSelect();
  setupCameraSelect();
  setupToggleButton();
  setupResolutionSelect();

  console.log("カメラ選択機能を初期化しました");
}

// ============================================================================
// 検出ループの制御関数
// ============================================================================

/**
 * 検出ループを開始する
 */
export function startPrediction() {
  isRunning = true;
  predictWebcam();
}

/**
 * 検出ループを停止する
 */
export function stopPrediction() {
  isRunning = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ============================================================================
// メイン検出・描画ループ
// ============================================================================

/**
 * Webカメラ映像から手と姿勢のランドマークを検出して描画する
 * requestAnimationFrameで連続的に呼び出される
 */
export function predictWebcam() {
  // カメラストリームが存在しない場合は終了
  if (!videoElement.srcObject) return;

  // ビデオの準備ができていない場合はスキップ
  if (videoElement.readyState < 2) {
    if (isRunning) {
      animationFrameId = window.requestAnimationFrame(predictWebcam);
    }
    return;
  }

  // 現在のタイムスタンプを取得
  const startTimeMs = performance.now();

  // キャンバスをクリア（毎フレーム実行）
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // 新しいビデオフレームの場合のみ検出を実行
  if (lastVideoTime !== videoElement.currentTime) {
    lastVideoTime = videoElement.currentTime;

    // 手のランドマークを検出
    const handDetections = handLandmarker?.detectForVideo(
      videoElement,
      startTimeMs
    );

    // 姿勢のランドマークを検出
    const poseDetections = poseLandmarker?.detectForVideo(
      videoElement,
      startTimeMs
    );

    // 手のランドマークを描画
    if (handDetections?.landmarks) {
      for (const landmarks of handDetections.landmarks) {
        // 手の骨格（接続線）を描画
        drawingUtils.drawConnectors(
          landmarks,
          HandLandmarker.HAND_CONNECTIONS,
          { color: "#00FF00", lineWidth: 5 }
        );
        // 手のキーポイントを描画
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });
      }
    }

    // 姿勢のランドマークを描画
    if (poseDetections?.landmarks) {
      for (const landmarks of poseDetections.landmarks) {
        // 姿勢の骨格（接続線）を描画
        drawingUtils.drawConnectors(
          landmarks,
          PoseLandmarker.POSE_CONNECTIONS,
          { color: "#00B6FF", lineWidth: 5 }
        );
        // 姿勢のキーポイントを描画
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FFB600",
          lineWidth: 2,
        });
      }
    }
  }

  // 検出ループが有効な場合は次のフレームをリクエスト
  if (isRunning) {
    animationFrameId = window.requestAnimationFrame(predictWebcam);
  }
}

// ============================================================================
// アプリケーションの起動
// ============================================================================

// アプリケーション開始時にモデルを初期化
createLandmarkers();
