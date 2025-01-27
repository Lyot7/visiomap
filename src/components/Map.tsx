"use client";
import React, { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1IjoiZWxpb3R0YnFybCIsImEiOiJjbGtjb3ozbWowcjg0M3FtdHdkbW9xNzIyIn0.kLerVKHmfUO0L2A43uXY9Q'; // Replace with your Mapbox access token

interface MapItem {
    id: number;
    coordinates: [number, number]; // Update the type to a tuple with exactly two elements
}

const Map = () => {
    const [mapItems, setMapItems] = useState<MapItem[]>([]);

    // First useEffect: Fetch user locations on component mount
    useEffect(() => {
        const fetchUserLocations = async () => {
            const response = await fetch('/api/user-locations'); // Fetch new locations
            const locations = await response.json();
            setMapItems(locations); // Update state with new locations
        };

        fetchUserLocations(); // Call the function to fetch locations
    }, []); // Run only once on mount

    // Second useEffect: Update map markers when mapItems changes
    useEffect(() => {
        const map = new mapboxgl.Map({
            container: 'map', // ID of the HTML element
            style: 'mapbox://styles/mapbox/outdoors-v12', // Map style
            center: [1.8252, 46.6034], // Centered in the geographical center of France
            zoom: 5 // Adjust the zoom level as needed
        });

        // Clear existing markers and add new ones
        map.on('load', () => {
            mapItems.forEach(user => {
                new mapboxgl.Marker()
                    .setLngLat(user.coordinates) // Set marker position
                    .setPopup(new mapboxgl.Popup().setText(`User ${user.id}`)) // Optional popup
                    .addTo(map); // Add marker to the map
            });
        });

        return () => map.remove(); // Cleanup on unmount
    }, [mapItems]); // Re-run this effect when mapItems changes

    return (
        <div id="map" className="w-full h-[70vh] rounded-3xl overflow-hidden"></div>
    );
};

export default Map;