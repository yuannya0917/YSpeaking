import React, { useRef } from "react";
import Recorder from "recorder-core";
import "recorder-core/src/engine/wav.js"; // wav 支持

const WS_URL = "ws://127.0.0.1:8000/api/realtime/ws"; // 换成你的后端地址

export default function TestRecorder() {
  const wsRef = useRef<WebSocket | null>(null);

  const connectWS = () => {
    wsRef.current = new WebSocket(WS_URL);
    wsRef.current.binaryType = "arraybuffer";
    wsRef.current.onopen = () => console.log("✅ WebSocket 已连接");
    wsRef.current.onmessage = (e) => console.log("收到后端消息:", e.data);
    wsRef.current.onerror = (err) => console.error("WebSocket 错误:", err);
  };

  const sendFile = async (file: Blob, label: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("❌ WebSocket 未连接");
      return;
    }
    console.log(`📤 发送 ${label}, 大小: ${file.size} bytes`);

    const arrayBuffer = await file.arrayBuffer(); // 转成原始二进制
    wsRef.current.send(arrayBuffer);
  };

  /** 测试 WAV */
  const testWav = async () => {
    const rec = Recorder({
      type: "wav",
      sampleRate: 16000,
      bitRate: 16,
    });
    rec.open(() => {
      rec.start();
      setTimeout(() => {
        rec.stop((blob:any) => {
          sendFile(blob, "WAV");
        });
      }, 5000);
    });
  };

  /** 测试 WEBM */
  const testWebm = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      sendFile(blob, "WEBM");
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 10000);
  };

  return (
    <div>
      <button onClick={connectWS}>连接 WebSocket</button>
      <button onClick={testWav}>测试 WAV</button>
      <button onClick={testWebm}>测试 WEBM</button>
    </div>
  );
}
