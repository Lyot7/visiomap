import { User } from '@/hooks/useWebSocket';
import { FeatureCollection } from 'geojson';
import mapboxgl from "mapbox-gl";
import React, { useEffect, useState } from "react";

// Définir le token d'accès pour Mapbox via la variable d'environnement
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX;

// Interface des propriétés du composant Map
interface MapProps {
  users: User[]
}

// Composant Map qui affiche une carte interactive avec la position des utilisateurs
const Map: React.FC<MapProps> = ({ users }) => {
  const [userPoints, setUserPoints] = useState<FeatureCollection>({
    type: "FeatureCollection",
    features: []
  });

  // Mise à jour des points utilisateurs à partir des données reçues
  useEffect(() => {
    setUserPoints({
      type: "FeatureCollection",
      features: users.map((user) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [user.coordinates.lng, user.coordinates.lat]
        },
        properties: {
          name: user.name
        }
      }))
    });
  }, [users]);

  // Initialisation de la carte Mapbox et affichage des points utilisateurs
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: "map", // ID de l'élément conteneur
      style: "mapbox://styles/mapbox/streets-v11", // Style de la carte
      center: [1.8252, 46.6034], // Position de départ [lng, lat]
      zoom: 2 // Niveau de zoom de départ
    });

    map.on("load", () => {
      // Ajout de la source GeoJSON contenant les points utilisateurs
      if (userPoints) {
        map.addSource("geojson-data", {
          type: "geojson",
          data: userPoints
        });

        // Ajout d'une couche pour visualiser les points utilisateurs
        map.addLayer({
          id: "points",
          type: "circle",
          source: "geojson-data",
          paint: {
            "circle-radius": 6,
            "circle-color": "#B42222"
          }
        });
      }
    });

    return () => map.remove(); // Nettoyage lors du démontage du composant
  }, [userPoints]);

  return <div className="rounded-2xl overflow-hidden h-[70%] w-[50%]" id="map" />;
};

export default Map;