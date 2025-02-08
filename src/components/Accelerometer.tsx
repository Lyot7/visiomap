"use client";
import { useEffect, useState } from 'react';

interface Sensor {
  x: number;
  y: number;
  z: number;
  start: () => void;
  stop: () => void;
  addEventListener: (type: string, listener: () => void) => void;
}

interface AccelerometerProps {
  onSpeedChange: (speed: number) => void;
}

const Accelerometer = ({ onSpeedChange }: AccelerometerProps) => {
  const [speed, setSpeed] = useState<number>(0);
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    // Vérifie si l'API Accelerometer est disponible
    if ('Accelerometer' in window) {
      setIsSupported(true);
      try {
        const accelerometer = new (window as unknown as {
          Accelerometer: new (options: { frequency: number }) => Sensor
        }).Accelerometer({ frequency: 60 });

        accelerometer.addEventListener('reading', () => {
          // Calcul simple de la vitesse basé sur la magnitude de l'accélération
          const magnitude = Math.sqrt(
            accelerometer.x ** 2 +
            accelerometer.y ** 2 +
            accelerometer.z ** 2
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
        console.error('Erreur lors de l\'accès à l\'accéléromètre:', error);
        setIsSupported(false);
      }
    }
  }, [onSpeedChange]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Accéléromètre</h3>
      {isSupported ? (
        <p>Vitesse actuelle: {speed.toFixed(2)} m/s²</p>
      ) : (
        <p>Accéléromètre non disponible sur cet appareil</p>
      )}
    </div>
  );
};

export default Accelerometer;
