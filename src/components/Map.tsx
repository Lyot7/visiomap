import React, { useEffect, useState } from 'react';
import MapboxGL, { Marker } from 'react-map-gl';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZWxpb3R0YnFybCIsImEiOiJjbGtjb3ozbWowcjg0M3FtdHdkbW9xNzIyIn0.kLerVKHmfUO0L2A43uXY9Q';

interface MapItem {
    id: number;
    coordinates: [number, number]; 
}

const Map = () => {
    const [mapItems, setMapItems] = useState<MapItem[]>([]);
    const [userPosition, setUserPosition] = useState({ lat: 0, lng: 0 });

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setUserPosition({ lat: latitude, lng: longitude });
                // Send position to the server
                fetch('/update-location', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ latitude, longitude })
                });
            });
        }
    };

    const fetchConnectedUsers = async () => {
        const response = await fetch('/users');
        const locations = await response.json();
        setMapItems(locations); 
    };

    useEffect(() => {
        getLocation(); 
        fetchConnectedUsers(); 
        const interval = setInterval(getLocation, 10000); 
        const userInterval = setInterval(fetchConnectedUsers, 10000); 
        return () => {
            clearInterval(interval);
            clearInterval(userInterval);
        };
    }, []);

    return (
        <MapboxGL
            initialViewState={{
                latitude: userPosition.lat,
                longitude: userPosition.lng,
                zoom: 10
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle='mapbox://styles/mapbox/streets-v11'
            mapboxAccessToken={MAPBOX_TOKEN}
        >
            {mapItems.map((user, index) => (
                <Marker key={index} longitude={user.coordinates[0]} latitude={user.coordinates[1]} anchor="bottom">
                    <div style={{ color: 'red' }}>👤</div>
                </Marker>
            ))}
        </MapboxGL>
    );
};

export default Map;