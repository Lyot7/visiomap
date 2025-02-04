import React, { useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { FeatureCollection } from 'geojson';

mapboxgl.accessToken = "pk.eyJ1IjoiZWxpb3R0YnFybCIsImEiOiJjbGtjb3ozbWowcjg0M3FtdHdkbW9xNzIyIn0.kLerVKHmfUO0L2A43uXY9Q"; // Replace with your Mapbox access token

interface User {
  id: number;
  name: string;
  coordinates: { lat: number; lng: number };
}

interface MapProps {
  users: User[]
}

const Map: React.FC<MapProps> = ({ users }) => {
  const [userPoints, setUserPoints] = useState<FeatureCollection>({
    type: "FeatureCollection",
    features: []
  });
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

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: "map", // ID of the container element
      style: "mapbox://styles/mapbox/streets-v11",
      center: [1.8252, 46.6034], // Starting position [lng, lat]
      zoom: 2 // Starting zoom level
    });

    map.on("load", () => {
      // Add the userpoints data as a source
      if (userPoints) {
        map.addSource("geojson-data", {
          type: "geojson",
          data: userPoints
        });

        // Add a layer to visualize the GeoJSON data
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

    return () => map.remove(); // Cleanup on unmount
  }, [userPoints]);

  return <div className="rounded-2xl h-[70%] w-full" id="map" />
};

export default Map;