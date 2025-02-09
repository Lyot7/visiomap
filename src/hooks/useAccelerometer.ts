"use client";
import { useEffect, useRef, useState } from "react";

const THROTTLE_INTERVAL = 500; // 500ms throttle interval

const useAccelerometer = (onSpeedChange: (speed: number) => void) => {
  const [speed, setSpeed] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);
  const lastSpeedUpdateRef = useRef<number>(0);

  const requestAccelerometerPermission = async () => {
    console.log("Requesting accelerometer permission...");
    try {
      const DeviceMotionEvent =
        window.DeviceMotionEvent as typeof globalThis.DeviceMotionEvent & {
          requestPermission?: () => Promise<PermissionState>;
        };

      if (
        "DeviceMotionEvent" in window &&
        typeof DeviceMotionEvent.requestPermission === "function"
      ) {
        console.log(
          "DeviceMotionEvent.requestPermission is available. Requesting permission now."
        );
        const permission = await DeviceMotionEvent.requestPermission();
        console.log("Accelerometer permission result:", permission);
        setPermissionStatus(permission);
        if (permission !== "granted") {
          console.warn("Accelerometer permission denied by user.");
        }
        return permission;
      }

      console.log(
        "No requestPermission function on DeviceMotionEvent. Assuming permission granted."
      );
      setPermissionStatus("granted");
      return "granted";
    } catch (error) {
      console.error("Error requesting accelerometer permission:", error);
      setPermissionStatus("denied");
      return "denied";
    }
  };

  useEffect(() => {
    console.log("Initializing accelerometer...");

    const handleMotion = (event: DeviceMotionEvent) => {
      console.log("devicemotion event triggered:", event);
      const acceleration = event.accelerationIncludingGravity;
      if (acceleration) {
        const magnitude = Math.sqrt(
          (acceleration.x || 0) ** 2 +
            (acceleration.y || 0) ** 2 +
            (acceleration.z || 0) ** 2
        );
        const newSpeed = Math.abs(magnitude);
        console.log(
          "Detected speed:",
          newSpeed,
          "from acceleration:",
          acceleration
        );
        setSpeed(newSpeed);

        const now = Date.now();
        if (now - lastSpeedUpdateRef.current >= THROTTLE_INTERVAL) {
          console.log("Calling onSpeedChange with newSpeed:", newSpeed);
          onSpeedChange(newSpeed);
          lastSpeedUpdateRef.current = now;
        } else {
          console.warn("Skipping speed update due to throttle limit");
        }
      } else {
        console.warn("No accelerometer data available from event.");
      }
    };

    const setupEventListener = () => {
      console.log("Setting up devicemotion event listener.");
      window.addEventListener("devicemotion", handleMotion);
      console.log("devicemotion event listener added.");

      return () => {
        console.log("Removing devicemotion event listener.");
        window.removeEventListener("devicemotion", handleMotion);
      };
    };

    const initializeAccelerometer = async () => {
      if (typeof window !== "undefined" && window.DeviceMotionEvent) {
        console.log("DeviceMotionEvent is supported by this device.");
        setIsSupported(true);

        const permission = await requestAccelerometerPermission();
        if (permission === "granted") {
          console.log(
            "Accelerometer permission granted. Setting up event listener."
          );
          setupEventListener();
        } else {
          console.warn("Accelerometer permission not granted or unsupported.");
        }
      } else {
        setIsSupported(false);
        console.warn("DeviceMotionEvent not supported on this device.");
      }
    };

    initializeAccelerometer();
  }, [onSpeedChange]);

  console.log(
    "useAccelerometer hook setup complete.",
    "Current speed:",
    speed,
    "Support:",
    isSupported,
    "Permission status:",
    permissionStatus
  );

  return {
    speed,
    isSupported,
    permissionStatus,
    requestPermission: requestAccelerometerPermission,
  };
};

export default useAccelerometer;
