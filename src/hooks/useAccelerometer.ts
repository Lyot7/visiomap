"use client";
import { useEffect, useState } from "react";

interface DeviceMotionEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

const useAccelerometer = (onSpeedChange: (speed: number) => void) => {
  const [speed, setSpeed] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.DeviceMotionEvent) {
      setIsSupported(true);
      try {
        const motionEvent =
          window.DeviceMotionEvent as unknown as DeviceMotionEventWithPermission;

        if (motionEvent.requestPermission) {
          motionEvent
            .requestPermission()
            .then((permissionState: string) => {
              if (permissionState === "granted") {
                setupEventListener();
              }
            })
            .catch(console.error);
        } else {
          setupEventListener();
        }
      } catch (error) {
        console.error("Erreur lors de l'accès à l'accéléromètre:", error);
        setIsSupported(false);
      }
    }

    function setupEventListener() {
      window.addEventListener("devicemotion", (event) => {
        const acceleration = event.acceleration;
        if (acceleration) {
          const magnitude = Math.sqrt(
            (acceleration.x || 0) ** 2 +
              (acceleration.y || 0) ** 2 +
              (acceleration.z || 0) ** 2
          );
          const newSpeed = Math.abs(magnitude);
          setSpeed(newSpeed);
          onSpeedChange(newSpeed);
        }
      });
    }

    return () => {
      window.removeEventListener("devicemotion", () => {});
    };
  }, [onSpeedChange]);

  return { speed, isSupported };
};

export default useAccelerometer;
