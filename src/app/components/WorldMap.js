import React, { useState, useEffect } from 'react'
import { Button, Flex } from 'antd';
import countriesData from '../data/countries.json';
import L from 'leaflet'
import { MapContainer, TileLayer, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const WorldMap = () => {

    const [currentRunningCountry, setCurrentRunningCountry] = useState(null);
    const [currentChasingCountry, setCurrentChasingCountry] = useState(null);
    const [runningCountries, setRunningCountries] = useState([]);
    const [chasingCountries, setChasingCountries] = useState([]);

    const handleStart = () => {
        const randomIndex = Math.floor(Math.random() * countriesData.length);
        const randomCountry = countriesData[randomIndex];
        setCurrentRunningCountry(randomCountry);
        setRunningCountries([randomCountry]);
    };

    useEffect(() => {
        if (currentRunningCountry) {
            console.log('Highlighting country:', currentRunningCountry.name.common);

            const interval = setInterval(() => {
                const borderCountries = currentRunningCountry.borders.map(borderCode =>
                    countriesData.find(country => country.cca3 === borderCode)
                );
    
                if (borderCountries.length) {
                    const randomBorderIndex = Math.floor(Math.random() * borderCountries.length);
                    const nextCountry = borderCountries[randomBorderIndex];
                    setCurrentRunningCountry(nextCountry);
                    setRunningCountries(prev => [...prev, nextCountry]);
                } else {
                    console.log('No border countries found for', currentRunningCountry.name.common);
                    setCurrentRunningCountry(null);
                }
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [currentRunningCountry]);

    const countryStyle = (feature) => {
        const isRunningCountry = runningCountries.some(
            (country) => country.cca3 === feature.properties.cca3
        );

        return {
            fillColor: isRunningCountry ? 'blue' : 'gray', // Change 'blue' to your desired color
            weight: 2,
            opacity: 1,
            color: 'white', // Border color
            fillOpacity: 0.7
        };
    };

    return (
        <>
        <MapContainer center={[51.505, -0.09]} zoom={2} style={{ height: '500px', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <GeoJSON
                data={countriesData} // Assuming this is the correct format
                style={countryStyle}
            />
        </MapContainer>
        <Flex gap="small" wrap="wrap" justify='center'>
            <Button 
                type="primary"
                onClick={handleStart}
            >Catch Bash!</Button>
        </Flex>
        </>
    );
};

export default WorldMap;