# VartualMirror_Client

VartualMirror_Client は Electron + Vite + TypeScript を使って作られたローカル向けのアプリケーションです。
このリポジトリは、MediaPipe のタスクファイルを含むクライアント側の実装を含んでいます。

## 概要
ユーザーのカメラ映像を処理して姿勢や手のランドマークなどを扱う用途を想定したクライアントアプリです。
MediaPipe のランタイム（wasm）とタスクファイルを `public/` に配置して動作させます。

## 今後実装する機能

- カメラの選択、切り替え
- VRChatOSCTrackingへの対応
- VMCプロトコルへの対応

## 現状

現在は MediaPipe で手と体のランドマーク取得までしかできていません。
トラッキングを行うためには、取得したランドマークから各ボーンの回転（rotation）に変換する処理が必要です。