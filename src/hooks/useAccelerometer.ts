"use client";
// Hook personnalisé pour récupérer et traiter les données de l'accéléromètre et calculer la vitesse intégrée.
import { useEffect, useRef, useState } from "react";

// Hook qui gère l'accéléromètre et fournit la vitesse calculée en km/h.
const useAccelerometer = (onSpeedChange: (speed: number) => void) => {
  // Etat local pour la vitesse calculée
  const [speed, setSpeed] = useState<number>(0);
  // Indique si l'accéléromètre est supporté sur le périphérique
  const [isSupported, setIsSupported] = useState<boolean>(false);
  // Stocke le statut de permission ("granted", "denied", ...)
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionState | null>(null);
  const THROTTLE_DELAY = 500; // Délai de 500ms pour limiter l'envoi du callback onSpeedChange

  // Ref pour stocker la vitesse calculée à envoyer en intervalle fixe
  const speedRef = useRef<number>(0);

  // Refs pour la vélocité et pour mémoriser le dernier timestamp afin d'effectuer l'intégration temporelle
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });
  const lastTimestampRef = useRef<number | null>(null);

  // Fonction pour demander la permission d'utiliser l'accéléromètre
  const requestAccelerometerPermission = async () => {
    console.log("Requesting accelerometer permission...");
    try {
      // Vérifie si l'API DeviceMotionEvent et la méthode requestPermission sont disponibles
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

      // Si la méthode requestPermission n'est pas présente, on suppose que la permission est accordée
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

    // Mise en place de l'écouteur de l'évènement 'devicemotion'
    const setupEventListener = () => {
      console.log("Setting up devicemotion event listener.");

      // Gestionnaire de l'évènement 'devicemotion'
      const handleMotion = (event: DeviceMotionEvent) => {
        // Utilisation de l'accélération sans gravité si disponible
        const acceleration =
          event.acceleration || event.accelerationIncludingGravity;
        if (!acceleration) {
          console.warn("No accelerometer data available from event.");
          return;
        }

        // Récupère le timestamp de l'évènement
        const currentTime = event.timeStamp;
        if (lastTimestampRef.current === null) {
          lastTimestampRef.current = currentTime;
          return; // On ignore le premier événement pour initialiser dt
        }

        // Calcul du temps écoulé (dt en secondes)
        const dt = (currentTime - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = currentTime;

        // Récupère les valeurs d'accélération (en m/s²)
        const ax = acceleration.x || 0;
        const ay = acceleration.y || 0;
        const az = acceleration.z || 0;

        // Optionnel : filtrage pour réduire le bruit sur de faibles valeurs d'accélération
        const accelMagnitude = Math.sqrt(ax * ax + ay * ay + az * az);
        const threshold = 0.1; // Seuil ajustable
        const effectiveAx = accelMagnitude < threshold ? 0 : ax;
        const effectiveAy = accelMagnitude < threshold ? 0 : ay;
        const effectiveAz = accelMagnitude < threshold ? 0 : az;

        // Intégration de l'accélération pour calculer la vitesse (v = u + a * dt)
        velocityRef.current.x += effectiveAx * dt;
        velocityRef.current.y += effectiveAy * dt;
        velocityRef.current.z += effectiveAz * dt;

        // Calcul de la vitesse comme norme du vecteur vitesse (en m/s)
        const currentSpeed =
          Math.sqrt(
            velocityRef.current.x ** 2 +
              velocityRef.current.y ** 2 +
              velocityRef.current.z ** 2
          ) || 0;

        // Application d'un amortissement pour simuler le frottement et limiter la dérive
        const damping = 0.98;
        velocityRef.current.x *= damping;
        velocityRef.current.y *= damping;
        velocityRef.current.z *= damping;

        // Conversion de la vitesse de m/s à km/h
        const speedInKmh = currentSpeed * 3.6;
        console.log("Integrated speed (km/h):", speedInKmh);

        // Mise à jour des états et de la référence
        setSpeed(speedInKmh);
        speedRef.current = speedInKmh;
      };

      window.addEventListener("devicemotion", handleMotion);
      console.log("devicemotion event listener added.");

      return () => {
        console.log("Removing devicemotion event listener.");
        window.removeEventListener("devicemotion", handleMotion);
      };
    };

    // Initialisation générale de l'accéléromètre
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

  // Intervalle pour envoyer la vitesse actuelle au callback (toutes les 500ms)
  useEffect(() => {
    const intervalId = setInterval(() => {
      onSpeedChange(speedRef.current);
    }, THROTTLE_DELAY);

    return () => clearInterval(intervalId);
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
