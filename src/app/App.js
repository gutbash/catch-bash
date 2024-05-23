import React, { useState, useEffect, useCallback } from 'react';
import { Button, Flex, Input, message } from 'antd';
import countriesData from './data/countries.json';
import { APIProvider, Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import Title from './components/Title';
import RunningMarkerSVG from './assets/running-marker.svg';
import ChasingMarkerSVG from './assets/chasing-marker.svg';

const WorldMap = () => {
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [currentRunningCountry, setCurrentRunningCountry] = useState(null);
    const [currentChasingCountry, setCurrentChasingCountry] = useState(null);
    const [runningCountries, setRunningCountries] = useState([]);
    const [chasingCountries, setChasingCountries] = useState([]);
    const [playerGuess, setPlayerGuess] = useState('');
    const [messageApi, contextHolder] = message.useMessage();

    const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const MAP_ID = process.env.NEXT_PUBLIC_MAP_ID;

    const map = useMap();

    const updateBounds = useCallback(() => {
        if (map && currentRunningCountry && currentChasingCountry) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng(currentRunningCountry.latlng[0], currentRunningCountry.latlng[1]));
            bounds.extend(new google.maps.LatLng(currentChasingCountry.latlng[0], currentChasingCountry.latlng[1]));
            map.fitBounds(bounds);
        }
    }, [map, currentRunningCountry, currentChasingCountry]);

    useEffect(() => {
        updateBounds();
    }, [updateBounds]);

    const handleStart = () => {
        const randomIndex = Math.floor(Math.random() * countriesData.length);
        const randomCountry = countriesData[randomIndex];
        setCurrentRunningCountry(randomCountry);
        setRunningCountries([randomCountry]);
        setChasingCountries([]);
        setIsGameStarted(true);
    };

    useEffect(() => {
        if (currentRunningCountry) {
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
                    setCurrentRunningCountry(null);
                }
            }, 10000);

            return () => clearInterval(interval);
        }
    }, [currentRunningCountry]);

    const handleGuessChange = (e) => {
        setPlayerGuess(e.target.value);
    };

    const handleGuessSubmit = () => {
        if (currentRunningCountry && playerGuess.toLowerCase() === currentRunningCountry.name.common.toLowerCase()) {
            messageApi.success('Congratulations! You caught Bash!');
            setIsGameStarted(false);
            setCurrentRunningCountry(null);
            setRunningCountries([]);
            setChasingCountries([]);
            setPlayerGuess('');
        } else {
            const guessedCountry = countriesData.find(country => country.name.common.toLowerCase() === playerGuess.toLowerCase());
            if (guessedCountry) {
                setCurrentChasingCountry(guessedCountry);
                setChasingCountries(prev => [...prev, guessedCountry]);
            } else {
                messageApi.error('Incorrect guess. Try again!');
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleGuessSubmit();
        }
    };

    const mapStyles = [
        {
            featureType: "poi",
            stylers: [{ visibility: "off" }]
        },
        {
            featureType: "transit",
            stylers: [{ visibility: "off" }]
        },
        {
            elementType: "labels",
            stylers: [{ visibility: "off" }]
        }
    ];

    const defaultCenter = {
        lat: 0,
        lng: 0
    };

    const RunningCountryMarker = () => {
        const map = useMap();

        return currentRunningCountry ? (
            <AdvancedMarker
                position={{ lat: currentRunningCountry.latlng[0], lng: currentRunningCountry.latlng[1] }}
                title={currentRunningCountry.name.common}
                map={map}
            >
                <RunningMarkerSVG width={20} height={20} />
            </AdvancedMarker>
        ) : null;
    };

    const ChasingCountryMarker = () => {
        const map = useMap();

        return currentChasingCountry ? (
            <AdvancedMarker
                position={{ lat: currentChasingCountry.latlng[0], lng: currentChasingCountry.latlng[1] }}
                title={currentChasingCountry.name.common}
                map={map}
            >
                <ChasingMarkerSVG width={20} height={20} />
            </AdvancedMarker>
        ) : null;
    };

    return (
        <>
            {contextHolder}
            {!isGameStarted ? (
                <Flex gap="small" wrap="wrap" justify='center'>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <h1>Welcome to Catch Bash</h1>
                    <p>Test your geography skills in this fun and interactive game!</p>
                    <Button type="primary" onClick={handleStart}>Start Game</Button>
                </div>
                </Flex>
            ) : (
                <div style={{ padding: '10vw' }}>
                    <Flex gap="small" wrap="wrap" justify='left'>
                        <Title />
                    </Flex>
                    <APIProvider
                        apiKey={GOOGLE_MAPS_API_KEY}
                        libraries={['places']}
                    >
                        <Flex gap="small" wrap="wrap" justify='center'>
                            <Map
                                style={{ width: '100vw', height: '50vh', marginBottom: '2vh' }}
                                defaultCenter={defaultCenter}
                                defaultZoom={2}
                                gestureHandling={'greedy'}
                                disableDefaultUI={false}
                                mapId={MAP_ID}
                            >
                                <RunningCountryMarker />
                                <ChasingCountryMarker />
                            </Map>
                        </Flex>
                    </APIProvider>
                    <Flex gap="large" wrap={false} justify='center' vertical={false}>
                        <Input
                            placeholder="Guess a country..."
                            value={playerGuess}
                            onChange={handleGuessChange}
                            onKeyPress={handleKeyPress}
                        />
                        <Button type="primary" onClick={handleGuessSubmit}>Submit</Button>
                    </Flex>
                </div>
            )}
        </>
    );
};

export default WorldMap;
