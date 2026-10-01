import { useEffect, useRef } from "react";
import { createHandLandmarker } from "../lib/hand/handLandmarker";

export default function Camera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const piecePositionRef = useRef({
    x: 300,
    y: 200,
  });

  const targetPositionRef = useRef({
    x: 500,
    y: 300,
  });

  const isSolvedRef = useRef(false);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    let grabOffset = {
      x: 0,
      y: 0,
    };

    let isGrabbing = false;

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
            const thumbTip = landmarks[4];

            const indexX = indexTip.x * canvas.width;
            const indexY = indexTip.y * canvas.height;

            const thumbX = thumbTip.x * canvas.width;
            const thumbY = thumbTip.y * canvas.height;

            // Calculate distance between thumb and index finger
            const distance = Math.sqrt(
              Math.pow(indexX - thumbX, 2) +
              Math.pow(indexY - thumbY, 2)
            );

            const isPinching = distance < 40;

            // Move the puzzle piece while pinching
            const piece = piecePositionRef.current;

            const isOverPiece =
            indexX >= piece.x - 30 &&
            indexX <= piece.x + 30 &&
            indexY >= piece.y - 30 &&
            indexY <= piece.y + 30;

            if (isPinching) {
            if (!isGrabbing && isOverPiece) {
                // Start grabbing only if the finger is over the piece
                grabOffset.x = piece.x - indexX;
                grabOffset.y = piece.y - indexY;

                isGrabbing = true;
            }

            if (isGrabbing) {
                piece.x = indexX + grabOffset.x;
                piece.y = indexY + grabOffset.y;
            }
            } else {
                if (isGrabbing) {
                    const target = targetPositionRef.current;
                    const piece = piecePositionRef.current;
                    
                    // Check if the piece is close enough to the target
                    const targetDistance = Math.sqrt(
                    Math.pow(piece.x - target.x, 2) +
                    Math.pow(piece.y - target.y, 2)
                    );

                    if (targetDistance < 40) {
                        // Snap the piece to the target
                        piece.x = target.x;
                        piece.y = target.y;
                        isSolvedRef.current = true;
                        console.log("PUZZLE SOLVED YURR!");
                    }
                }
                isGrabbing = false;
            }

            // Draw index fingertip
            ctx.beginPath();
            ctx.arc(indexX, indexY, 12, 0, Math.PI * 2);
            ctx.fill();

            console.log(isPinching ? "PINCH" : "RELEASE");
          }

          // Get current positions
          const piece = piecePositionRef.current;
          const target = targetPositionRef.current;

        // Calculate distance between piece and target
        const targetDistance = Math.sqrt(
        Math.pow(piece.x - target.x, 2) +
        Math.pow(piece.y - target.y, 2)
        );

        const isNearTarget = targetDistance < 70;

        // Draw puzzle piece
        ctx.beginPath();
        ctx.rect(
        piece.x - 30,
        piece.y - 30,
        60,
        60
        );
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw target area
        ctx.beginPath();
        ctx.rect(
        target.x - 40,
        target.y - 40,
        80,
        80
        );

        ctx.strokeStyle = "green";

        if (isSolvedRef.current) {
        ctx.lineWidth = 5;
        } else if (isNearTarget) {
        ctx.lineWidth = 3;
        } else {
        ctx.lineWidth = 1;
        }

        ctx.stroke();

        // Draw success message
        if (isSolvedRef.current) {
        ctx.font = "24px sans-serif";
        ctx.fillStyle = "green";

        ctx.fillText(
            "Puzzle Solved!",
            target.x - 80,
            target.y + 70
        );
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