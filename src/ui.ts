/**
 * ui.ts
 * UIコントロール（カメラ選択、解像度選択、開始/停止ボタン）の管理
 */

import { stopPrediction, startPrediction } from "./renderer";

// ============================================================================
// 状態管理変数
// ============================================================================

// 現在のカメラストリーム
let currentStream: MediaStream | null = null;

// カメラのアクティブ状態
let isCameraActive = false;

// 選択された解像度（デフォルト: HD）
let selectedResolution = "1280x720";

// ============================================================================
// カメラ制御関数
// ============================================================================

/**
 * カメラを有効化する
 * @param deviceId - カメラデバイスID（省略時はデフォルトカメラ）
 */
export async function enableCam(deviceId?: string) {
  const videoElement = document.getElementById("webcam") as HTMLVideoElement;

  // 選択された解像度を取得
  const [width, height] = selectedResolution.split("x").map(Number);

  // カメラの制約条件を設定
  const constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: width },
      height: { ideal: height },
      ...(deviceId && { deviceId: { exact: deviceId } }),
    },
  };

  // 検出ループを一度停止
  stopPrediction();

  // 既存のストリームがあれば停止
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
  }

  // 新しいカメラストリームを取得
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  currentStream = stream;
  videoElement.srcObject = stream;
  isCameraActive = true;

  // ボタンの状態を更新
  updateToggleButtonState();

  // ビデオのメタデータ（解像度など）が読み込まれるまで待機
  await new Promise((resolve) => {
    const onLoadedMetadata = () => {
      console.log(
        `カメラの解像度: ${videoElement.videoWidth} x ${videoElement.videoHeight}`
      );
      videoElement.removeEventListener("loadedmetadata", onLoadedMetadata);
      resolve(true);
    };
    videoElement.addEventListener("loadedmetadata", onLoadedMetadata);
  });

  // カメラが有効化されたら検出を開始
  startPrediction();
}

/**
 * カメラを停止する
 */
export function disableCam() {
  const videoElement = document.getElementById("webcam") as HTMLVideoElement;

  // ストリームを停止
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }

  videoElement.srcObject = null;
  isCameraActive = false;

  // 検出ループも停止
  stopPrediction();

  // ボタンの状態を更新
  updateToggleButtonState();
}

// ============================================================================
// カメラデバイス選択
// ============================================================================

/**
 * 利用可能なカメラデバイスのリストを取得して
 * セレクトボックスに追加する
 */
export async function populateCameraSelect() {
  const cameraSelect = document.getElementById(
    "camera-select"
  ) as HTMLSelectElement;
  if (!cameraSelect) return;

  try {
    // すべてのメディアデバイスを取得
    const devices = await navigator.mediaDevices.enumerateDevices();

    // ビデオ入力デバイス（カメラ）のみをフィルタ
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput"
    );

    // 既存のオプションをクリア
    cameraSelect.innerHTML = "";

    // カメラが見つからない場合
    if (videoDevices.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "カメラが見つかりません";
      option.disabled = true;
      cameraSelect.appendChild(option);
      return;
    }

    // カメラをオプションとして追加
    videoDevices.forEach((device) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent =
        device.label || `カメラ ${device.deviceId.slice(0, 8)}...`;
      cameraSelect.appendChild(option);
    });

    // 最初のカメラを選択
    if (videoDevices.length > 0) {
      cameraSelect.selectedIndex = 0;
    }
  } catch (error) {
    console.error("カメラデバイスの取得に失敗しました:", error);
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "カメラの取得に失敗しました";
    option.disabled = true;
    cameraSelect.appendChild(option);
  }
}

/**
 * カメラ選択セレクトボックスのイベントリスナーを設定
 */
export function setupCameraSelect() {
  const cameraSelect = document.getElementById(
    "camera-select"
  ) as HTMLSelectElement;
  if (!cameraSelect) return;

  cameraSelect.addEventListener("change", async () => {
    const selectedDeviceId = cameraSelect.value;
    if (selectedDeviceId) {
      await enableCam(selectedDeviceId);
    }
  });
}

// ============================================================================
// 解像度選択
// ============================================================================

/**
 * 解像度選択セレクトボックスのイベントリスナーを設定
 */
export function setupResolutionSelect() {
  const resolutionSelect = document.getElementById(
    "resolution-select"
  ) as HTMLSelectElement;
  if (!resolutionSelect) return;

  resolutionSelect.addEventListener("change", async () => {
    selectedResolution = resolutionSelect.value;
    console.log(`解像度を変更しました: ${selectedResolution}`);

    // カメラが有効な場合は新しい解像度で再度有効化
    if (isCameraActive) {
      const cameraSelect = document.getElementById(
        "camera-select"
      ) as HTMLSelectElement;
      const selectedDeviceId = cameraSelect?.value || undefined;
      await enableCam(selectedDeviceId);
    }
  });
}

// ============================================================================
// 開始/停止トグルボタン
// ============================================================================

/**
 * トグルボタンの表示状態を更新する
 */
function updateToggleButtonState() {
  const toggleButton = document.getElementById(
    "camera-toggle-button"
  ) as HTMLButtonElement;
  if (!toggleButton) return;

  if (isCameraActive) {
    // カメラがアクティブな場合: 赤色の「停止」ボタン
    toggleButton.textContent = "停止";
    toggleButton.classList.remove("bg-primary");
    toggleButton.classList.add("bg-red-600");
  } else {
    // カメラが停止中の場合: 青色の「開始」ボタン
    toggleButton.textContent = "開始/停止 トグルボタン";
    toggleButton.classList.remove("bg-red-600");
    toggleButton.classList.add("bg-primary");
  }
}

/**
 * トグルボタンのイベントリスナーを設定
 */
export function setupToggleButton() {
  const toggleButton = document.getElementById(
    "camera-toggle-button"
  ) as HTMLButtonElement;
  if (!toggleButton) return;

  toggleButton.addEventListener("click", async () => {
    if (isCameraActive) {
      // カメラがアクティブな場合: 停止
      disableCam();
    } else {
      // カメラが停止中の場合: 開始
      const cameraSelect = document.getElementById(
        "camera-select"
      ) as HTMLSelectElement;
      const selectedDeviceId = cameraSelect?.value || undefined;
      await enableCam(selectedDeviceId);
    }
  });
}
