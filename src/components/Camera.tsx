import { useEffect, useRef } from "react";
import { createHandLandmarker } from "../lib/hand/handLandmarker";

export default function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    async function setup() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
          },
        });

        const video = videoRef.current;

        if (!video) return;

        video.srcObject = stream;

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });

        await video.play();

        const handLandmarker = await createHandLandmarker();

        function detectHands() {
          if (!videoRef.current || !canvasRef.current) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          if (!ctx) return;

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const results = handLandmarker.detectForVideo(
            video,
            performance.now()
          );

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];

            const indexTip = landmarks[8];

            const x = indexTip.x * canvas.width;
            const y = indexTip.y * canvas.height;

            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();

            console.log("Index fingertip:", {
                x,
                y,
            });
          }

          animationFrameId = requestAnimationFrame(detectHands);
        }

        detectHands();
      } catch (error) {
        console.error("Camera setup failed:", error);
      }
    }

    setup();

    return () => {
      cancelAnimationFrame(animationFrameId);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "640px",
        maxWidth: "100%",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          display: "block",
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}