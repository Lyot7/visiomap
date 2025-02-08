"use client";
import { useEffect, useState } from "react";

const useAccelerometer = (onSpeedChange: (speed: number) => void) => {
  const [speed, setSpeed] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);

  const requestAccelerometerPermission = async () => {
    try {
      // Extend the DeviceMotionEvent type to include requestPermission
      const DeviceMotionEvent =
        window.DeviceMotionEvent as typeof globalThis.DeviceMotionEvent & {
          requestPermission?: () => Promise<PermissionState>;
        };

      // Check if the Sensors API is available
      if (
        "DeviceMotionEvent" in window &&
        typeof DeviceMotionEvent.requestPermission === "function"
      ) {
        const permission = await DeviceMotionEvent.requestPermission();
        setPermissionStatus(permission);
        return permission;
      }

      // If permission is not needed (Android, etc.), consider as "granted"
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
      };

      window.addEventListener("devicemotion", handleMotion);
      return () => window.removeEventListener("devicemotion", handleMotion);
    };

    const initializeAccelerometer = async () => {
      if (typeof window !== "undefined" && window.DeviceMotionEvent) {
        setIsSupported(true);

        const permission = await requestAccelerometerPermission();
        if (permission === "granted") {
          return setupEventListener(); // Return the cleanup function
        }
      } else {
        setIsSupported(false);
      }
      return undefined; // Return undefined if not supported or permission denied
    };

    // Call the async function and handle cleanup
    let cleanup: (() => void) | undefined;
    initializeAccelerometer().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) cleanup(); // Call the cleanup function if it exists
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
