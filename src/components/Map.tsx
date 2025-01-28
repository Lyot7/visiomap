"use client";
import React, { useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1IjoiZWxpb3R0YnFybCIsImEiOiJjbGtjb3ozbWowcjg0M3FtdHdkbW9xNzIyIn0.kLerVKHmfUO0L2A43uXY9Q"; // Replace with your Mapbox access token

const Map = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Establish WebSocket connection
    const ws = new WebSocket("ws://localhost:7864"); // Adjust the URL as necessary

    // Handle incoming messages
    ws.onmessage = (event) => {
      const updatedUsers = JSON.parse(event.data);
      setUsers(updatedUsers); // Update users state with new data
    };

    // Clean up the WebSocket connection on unmount
    return () => {
      ws.close();
    };
  }, []);



  // Second useEffect: Update map markers when mapItems changes
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: "map", // ID of the HTML element
      style: "mapbox://styles/mapbox/outdoors-v12", // Map style
      center: [1.8252, 46.6034], // Centered in the geographical center of France
      zoom: 5, // Adjust the zoom level as needed
    });

    // Clear existing markers and add new ones
    // map.on("load", () => {
    //   users.forEach((user) => {
    //     new mapboxgl.Marker()
    //       .setLngLat(user.coordinates) // Set marker position
    //       .setPopup(new mapboxgl.Popup().setText(`User ${user.id}`)) // Optional popup
    //       .addTo(map); // Add marker to the map
    //   });
    // });

    return () => map.remove(); // Cleanup on unmount
  }, [users]); // Re-run this effect when users changes

  return (
    <div id="map" className="w-full h-[70vh] rounded-3xl overflow-hidden"></div>
  );
};

export default Map;
