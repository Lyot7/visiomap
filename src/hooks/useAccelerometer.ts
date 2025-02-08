"use client";
import { useEffect, useState } from "react";

const useAccelerometer = (onSpeedChange: (speed: number) => void) => {
  const [speed, setSpeed] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);

  const requestAccelerometerPermission = async () => {
    try {
      const DeviceMotionEvent =
        window.DeviceMotionEvent as typeof globalThis.DeviceMotionEvent & {
          requestPermission?: () => Promise<PermissionState>;
        };

      if (
        "DeviceMotionEvent" in window &&
        typeof DeviceMotionEvent.requestPermission === "function"
      ) {
        const permission = await DeviceMotionEvent.requestPermission();
        setPermissionStatus(permission);
        if (permission !== "granted") {
          console.warn("Accelerometer permission denied by user.");
        }
        return permission;
      }

      setPermissionStatus("granted");
      return "granted";
    } catch (error) {
      console.error("Error requesting permission:", error);
      setPermissionStatus("denied");
      return "denied";
    }
  };

  useEffect(() => {
    const setupEventListener = () => {
      const handleMotion = (event: DeviceMotionEvent) => {
        const acceleration = event.accelerationIncludingGravity;
        if (acceleration) {
          const magnitude = Math.sqrt(
            (acceleration.x || 0) ** 2 +
              (acceleration.y || 0) ** 2 +
              (acceleration.z || 0) ** 2
          );
          const newSpeed = Math.abs(magnitude);
          console.log("Detected speed:", newSpeed);
          setSpeed(newSpeed);
          onSpeedChange(newSpeed);
        }
      };

      window.addEventListener("devicemotion", handleMotion);
      return () => window.removeEventListener("devicemotion", handleMotion);
    };

    const initializeAccelerometer = async () => {
      if (typeof window !== "undefined" && window.DeviceMotionEvent) {
        setIsSupported(true);

        const permission = await requestAccelerometerPermission();
        if (permission === "granted") {
          const cleanup = setupEventListener();
          return cleanup;
        } else {
          console.warn("Accelerometer access denied or unsupported.");
        }
      } else {
        setIsSupported(false);
        console.warn("DeviceMotionEvent not supported on this device.");
      }
      return undefined;
    };

    let cleanup: (() => void) | undefined;
    initializeAccelerometer().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [onSpeedChange]);

  return {
    speed,
    isSupported,
    permissionStatus,
    requestPermission: requestAccelerometerPermission,
  };
};

export default useAccelerometer;
