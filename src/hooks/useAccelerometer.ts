"use client";
import { useEffect, useRef, useState } from "react";

const useAccelerometer = (onSpeedChange: (speed: number) => void) => {
  const [speed, setSpeed] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);
  const lastSend = useRef<number>(Date.now());
  const THROTTLE_DELAY = 500; // 500ms throttle delay

  // Refs to hold velocity and the previous timestamp for integration.
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });
  const lastTimestampRef = useRef<number | null>(null);

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

    const setupEventListener = () => {
      console.log("Setting up devicemotion event listener.");

      const handleMotion = (event: DeviceMotionEvent) => {
        // Use acceleration without gravity if available; otherwise fallback
        const acceleration =
          event.acceleration || event.accelerationIncludingGravity;
        if (!acceleration) {
          console.warn("No accelerometer data available from event.");
          return;
        }

        // Get the current event timestamp (in ms)
        const currentTime = event.timeStamp;
        if (lastTimestampRef.current === null) {
          lastTimestampRef.current = currentTime;
          return; // Skip the very first event to initialize dt
        }

        // Compute the time difference in seconds
        const dt = (currentTime - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = currentTime;

        // Retrieve acceleration values (m/s²)
        const ax = acceleration.x || 0;
        const ay = acceleration.y || 0;
        const az = acceleration.z || 0;

        // Optional: Filter out noise if the acceleration magnitude is very low
        const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        const threshold = 0.1; // Adjust threshold as needed
        const effectiveAx = accelMagnitude < threshold ? 0 : ax;
        const effectiveAy = accelMagnitude < threshold ? 0 : ay;
        const effectiveAz = accelMagnitude < threshold ? 0 : az;

        // Integrate acceleration over time to update velocity (v = u + a * dt)
        velocityRef.current.x += effectiveAx * dt;
        velocityRef.current.y += effectiveAy * dt;
        velocityRef.current.z += effectiveAz * dt;

        // Compute speed as the magnitude of the velocity vector (in m/s)
        const currentSpeed =
          Math.sqrt(
            velocityRef.current.x ** 2 +
              velocityRef.current.y ** 2 +
              velocityRef.current.z ** 2
          ) || 0;

        // Optional: Apply damping to counteract drift (simulating friction)
        const damping = 0.98; // Adjust damping factor as needed (1 = no damping)
        velocityRef.current.x *= damping;
        velocityRef.current.y *= damping;
        velocityRef.current.z *= damping;

        // Convert speed from m/s to km/h
        const speedInKmh = currentSpeed * 3.6;
        console.log("Integrated speed (km/h):", speedInKmh);

        // Update local state for UI, etc.
        setSpeed(speedInKmh);

        // Throttle sending the speed via onSpeedChange to at most every 500ms.
        const now = Date.now();
        if (now - lastSend.current >= THROTTLE_DELAY) {
          onSpeedChange(speedInKmh);
          lastSend.current = now;
        }
      };

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
    "isSupported:",
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
