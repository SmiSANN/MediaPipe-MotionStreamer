# VartualMirror_Client

VartualMirror_Client は Electron + Vite + TypeScript を使って作られたローカル向けのアプリケーションです。
このリポジトリは、MediaPipe のタスクファイルを含むクライアント側の実装を含んでいます。

## 概要
ユーザーのカメラ映像を処理して姿勢や手のランドマークなどを扱う用途を想定したクライアントアプリです。
MediaPipe のランタイム（wasm）とタスクファイルを `public/` に配置して動作させます。