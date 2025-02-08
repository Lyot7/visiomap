"use client";
import { useEffect, useState } from "react";

interface Sensor {
  x: number;
  y: number;
  z: number;
  start: () => void;
  stop: () => void;
  addEventListener: (type: string, listener: () => void) => void;
}

const useAccelerometer = (onSpeedChange: (speed: number) => void) => {
  const [speed, setSpeed] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    if ("Accelerometer" in window) {
      setIsSupported(true);
      try {
        const accelerometer = new (
          window as unknown as {
            Accelerometer: new (options: { frequency: number }) => Sensor;
          }
        ).Accelerometer({ frequency: 60 });

        accelerometer.addEventListener("reading", () => {
          const magnitude = Math.sqrt(
            accelerometer.x ** 2 + accelerometer.y ** 2 + accelerometer.z ** 2
          );

          const newSpeed = Math.abs(magnitude);
          setSpeed(newSpeed);
          onSpeedChange(newSpeed);
        });

        accelerometer.start();

        return () => {
          accelerometer.stop();
        };
      } catch (error) {
        console.error("Erreur lors de l'accès à l'accéléromètre:", error);
        setIsSupported(false);
      }
    }
  }, [onSpeedChange]);

  return { speed, isSupported };
};

export default useAccelerometer;
