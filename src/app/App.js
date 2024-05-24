import React, { useState, useEffect, useCallback } from 'react';
import { Button, Flex, Input, message, Space, Progress, List } from 'antd';
import countriesData from './data/countries.json';
import { APIProvider, Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import RunningMarkerSVG from './assets/running-marker.svg';
import ChasingMarkerSVG from './assets/chasing-marker.svg';
import AirplaneSVG from './assets/airplane.svg';
import EarthSVG from './assets/earth.svg';
import Earth48SVG from './assets/earth-48.svg';
import { Typography } from 'antd';
const { Title } = Typography;

const haversineDistance = (coords1, coords2) => {
    const toRad = (x) => x * Math.PI / 180;
    const R = 6371; // Earth’s mean radius in kilometers
    const dLat = toRad(coords2.lat - coords1.lat);
    const dLong = toRad(coords2.lng - coords1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const WorldMap = () => {
    const [log, setLog] = useState([]);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [currentRunningCountry, setCurrentRunningCountry] = useState(null);
    const [currentChasingCountry, setCurrentChasingCountry] = useState(null);
    const [runningCountries, setRunningCountries] = useState([]);
    const [chasingCountries, setChasingCountries] = useState([]);
    const [playerGuess, setPlayerGuess] = useState('');
    const [messageApi, contextHolder] = message.useMessage();
    const [progress, setProgress] = useState(0);
    const [isAnimating, setIsAnimating] = useState({ running: false, chasing: false });
    const [markerPosition, setMarkerPosition] = useState({ running: null, chasing: null });
    const [mapInstance, setMapInstance] = useState(null);

    const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const MAP_ID = process.env.NEXT_PUBLIC_MAP_ID;

    const isValidLatLng = (coords) => {
        return coords && !isNaN(coords.lat) && !isNaN(coords.lng);
    };

    const animateMarker = (map, startCoords, endCoords, setMarkerCoords, callback) => {
        const distance = haversineDistance(startCoords, endCoords);
        const duration = distance * 1; // Adjust this multiplier for desired speed
        const steps = Math.max(20, Math.min(200, duration / 100)); // Ensure a reasonable number of steps
        const stepDuration = duration / steps;
    
        let step = 0;
        const latStep = (endCoords.lat - startCoords.lat) / steps;
        const lngStep = (endCoords.lng - startCoords.lng) / steps;
    
        // Adjust the bounds before the animation starts
        if (map) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng(endCoords.lat, endCoords.lng));
            map.fitBounds(bounds);
        }
    
        const interval = setInterval(() => {
            const newLat = startCoords.lat + latStep * step;
            const newLng = startCoords.lng + lngStep * step;
    
            if (step < steps && isValidLatLng({ lat: newLat, lng: newLng })) {
                setMarkerCoords({ lat: newLat, lng: newLng });
                step += 1;
            } else {
                clearInterval(interval);
                setMarkerCoords(endCoords);
                if (callback) callback();
            }
        }, stepDuration);
    };

    const calculateRotation = (startCoords, endCoords) => {
        const deltaY = endCoords.lat - startCoords.lat;
        const deltaX = endCoords.lng - startCoords.lng;
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        return angle - 45; // Adjust for the initial orientation pointing to the top-right
    };

    const handleStart = () => {
        const randomIndexRunning = Math.floor(Math.random() * countriesData.length);
        const randomCountryRunning = countriesData[randomIndexRunning];
        const randomIndexChasing = Math.floor(Math.random() * countriesData.length);
        const randomCountryChasing = countriesData[randomIndexChasing];

        setCurrentRunningCountry(randomCountryRunning);
        setMarkerPosition(prev => ({ ...prev, running: { lat: randomCountryRunning.latlng[0], lng: randomCountryRunning.latlng[1] } }));
        setCurrentChasingCountry(randomCountryChasing);
        setMarkerPosition(prev => ({ ...prev, chasing: { lat: randomCountryChasing.latlng[0], lng: randomCountryChasing.latlng[1] } }));
        setRunningCountries([randomCountryRunning]);
        setChasingCountries([randomCountryChasing]);
        setIsGameStarted(true);
    };

    // Inside useEffect for running country animation
    useEffect(() => {
        if (currentRunningCountry && !isAnimating.running) {
            const interval = setInterval(() => {
                const visitedCountryCodes = runningCountries.map(country => country.cca3);
                const borderCountries = currentRunningCountry.borders
                    .map(borderCode => countriesData.find(country => country.cca3 === borderCode))
                    .filter(borderCountry => borderCountry && !visitedCountryCodes.includes(borderCountry.cca3));

                let nextCountry;
                if (borderCountries.length) {
                    const randomBorderIndex = Math.floor(Math.random() * borderCountries.length);
                    nextCountry = borderCountries[randomBorderIndex];
                    // Teleport without animation
                    setCurrentRunningCountry(nextCountry);
                    setRunningCountries(prev => [...prev, nextCountry]);
                    setMarkerPosition(prev => ({ ...prev, running: { lat: nextCountry.latlng[0], lng: nextCountry.latlng[1] } }));
                    setLog(prev => [{ player: 'Bash', country: `${nextCountry.name.common}`, region: `${nextCountry.region}` }, ...prev].slice(0, 3));
                } else {
                    const unvisitedCountries = countriesData.filter(country => !visitedCountryCodes.includes(country.cca3));
                    if (unvisitedCountries.length) {
                        const randomUnvisitedIndex = Math.floor(Math.random() * unvisitedCountries.length);
                        nextCountry = unvisitedCountries[randomUnvisitedIndex];
                    } else {
                        nextCountry = null;
                    }

                    if (nextCountry) {
                        setIsAnimating(prev => ({ ...prev, running: true }));
                        animateMarker(
                            mapInstance,
                            { lat: currentRunningCountry.latlng[0], lng: currentRunningCountry.latlng[1] },
                            { lat: nextCountry.latlng[0], lng: nextCountry.latlng[1] },
                            (coords) => setMarkerPosition(prev => ({ ...prev, running: { lat: coords.lat, lng: coords.lng } })),
                            () => {
                                setCurrentRunningCountry(nextCountry);
                                setRunningCountries(prev => [...prev, nextCountry]);
                                setLog(prev => [{ player: 'Bash', country: `${nextCountry.name.common}`, region: `${nextCountry.region}` }, ...prev].slice(0, 3));
                                setIsAnimating(prev => ({ ...prev, running: false }));
                            }
                        );
                    } else {
                        setCurrentRunningCountry(null);
                        setLog(prev => [{ player: 'Bash', country: 'Nowhere', region: 'Nowhere' }, ...prev].slice(0, 3));
                    }
                }
            }, 10000);

            return () => clearInterval(interval);
        }
    }, [currentRunningCountry, runningCountries, isAnimating.running]);

    useEffect(() => {
        if (currentRunningCountry && currentChasingCountry) {
            const distance = haversineDistance(
                { lat: currentRunningCountry.latlng[0], lng: currentRunningCountry.latlng[1] },
                { lat: currentChasingCountry.latlng[0], lng: currentChasingCountry.latlng[1] }
            );

            // Assuming the maximum distance on Earth is approximately 20,000 km.
            const maxDistance = 20000;
            const progressPercentage = Math.max(0, Math.min(100, 100 - (distance / maxDistance) * 100));
            setProgress(progressPercentage);

            // Check for win condition
            if (progressPercentage >= 100) {
                messageApi.success('Congratulations! You caught Bash!');
                setIsGameStarted(false);
                setCurrentRunningCountry(null);
                setRunningCountries([]);
                setChasingCountries([]);
                setPlayerGuess('');
                setProgress(0);
            }
        }
    }, [currentRunningCountry, currentChasingCountry, progress]);

    const handleGuessChange = (e) => {
        setPlayerGuess(e.target.value);
    };

    // Inside handleGuessSubmit for chasing country animation
    const handleGuessSubmit = () => {
        if (isAnimating.chasing) return;

        if (currentRunningCountry && playerGuess.toLowerCase() === currentRunningCountry.name.common.toLowerCase()) {
            messageApi.success('Congratulations! You caught Bash!');
            setIsGameStarted(false);
            setCurrentRunningCountry(null);
            setRunningCountries([]);
            setChasingCountries([]);
            setPlayerGuess('');
            setProgress(0);
        } else {
            const guessedCountry = countriesData.find(country => country.name.common.toLowerCase() === playerGuess.toLowerCase());
            if (guessedCountry) {
                if (currentChasingCountry.borders.includes(guessedCountry.cca3)) {
                    // Teleport without animation
                    setCurrentChasingCountry(guessedCountry);
                    setChasingCountries(prev => [...prev, guessedCountry]);
                    setMarkerPosition(prev => ({ ...prev, chasing: { lat: guessedCountry.latlng[0], lng: guessedCountry.latlng[1] } }));
                    setLog(prev => [{ player: 'You', country: `${playerGuess}`, region: `${guessedCountry.region}` }, ...prev].slice(0, 3));
                } else {
                    setIsAnimating(prev => ({ ...prev, chasing: true }));
                    animateMarker(
                        mapInstance,
                        { lat: currentChasingCountry.latlng[0], lng: currentChasingCountry.latlng[1] },
                        { lat: guessedCountry.latlng[0], lng: guessedCountry.latlng[1] },
                        (coords) => setMarkerPosition(prev => ({ ...prev, chasing: { lat: coords.lat, lng: coords.lng } })),
                        () => {
                            setCurrentChasingCountry(guessedCountry);
                            setChasingCountries(prev => [...prev, guessedCountry]);
                            setLog(prev => [{ player: 'You', country: `${playerGuess}`, region: `${guessedCountry.region}` }, ...prev].slice(0, 3));
                            setIsAnimating(prev => ({ ...prev, chasing: false }));
                        }
                    );
                }
            } else {
                messageApi.error('Not a country. Try again!');
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleGuessSubmit();
        }
    };

    const defaultCenter = {
        lat: 0,
        lng: 0
    };

    const MapComponent = ({ currentRunningCountry, currentChasingCountry }) => {
        const map = useMap();

        useEffect(() => {
            if (map) {
                setMapInstance(map);
            }
        }, [map]);

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

        return (
            <>
                {markerPosition.running && isValidLatLng(markerPosition.running) && (
                    <AdvancedMarker
                        position={new google.maps.LatLng(markerPosition.running.lat, markerPosition.running.lng)}
                        title={currentRunningCountry.name.common}
                        map={map}
                    >
                        {isAnimating.running && !currentRunningCountry.borders.includes(currentChasingCountry?.cca3) ? (
                            <AirplaneSVG
                                width={20}
                                height={20}
                                style={{ transform: `rotate(${calculateRotation({ lat: currentRunningCountry.latlng[0], lng: currentRunningCountry.latlng[1] }, markerPosition.running)}deg)` }}
                            />
                        ) : (
                            <RunningMarkerSVG width={20} height={20} />
                        )}
                    </AdvancedMarker>
                )}
                {markerPosition.chasing && isValidLatLng(markerPosition.chasing) && (
                    <AdvancedMarker
                        position={new google.maps.LatLng(markerPosition.chasing.lat, markerPosition.chasing.lng)}
                        title={currentChasingCountry.name.common}
                        map={map}
                    >
                        {isAnimating.chasing && !currentChasingCountry.borders.includes(currentRunningCountry?.cca3) ? (
                            <AirplaneSVG
                                width={20}
                                height={20}
                                style={{ transform: `rotate(${calculateRotation({ lat: currentChasingCountry.latlng[0], lng: currentChasingCountry.latlng[1] }, markerPosition.chasing)}deg)` }}
                            />
                        ) : (
                            <ChasingMarkerSVG width={20} height={20} />
                        )}
                    </AdvancedMarker>
                )}
            </>
        );
    };

    return (
        <>
            {contextHolder}
            {!isGameStarted ? (
                <div style={{ textAlign: 'center', padding: '10vh', color: 'black' }}>
                    <EarthSVG width={256} height={256} />
                    <Title>Welcome to Catch Bash!</Title>
                    <p><RunningMarkerSVG width={20} height={20} /> Bash is running away.</p>
                    <p><ChasingMarkerSVG width={20} height={20} /> You are chasing him.</p>
                    <Title level={5} >Guess the country where Bash is hiding to catch him!</Title>
                    <Button style={{ width: '15em', marginTop: '1.5vh' }} size='middle' type="primary" onClick={handleStart}>Start</Button>
                </div>
            ) : (
                <div style={{ paddingLeft: '10vw', paddingRight: '10vw', paddingTop: '10vh'}}>
                    <Earth48SVG width={48} height={48} style={{ marginBottom: '-1vh' }} />
                    <Title>Catch Bash!</Title>
                    <APIProvider
                        apiKey={GOOGLE_MAPS_API_KEY}
                        libraries={['places']}
                    >
                        <Flex gap="small" wrap="wrap" justify='center'>
                            <Progress percent={progress} showInfo={false} />
                            <Map
                                minZoom={2}
                                style={{ width: '100vw', height: '50vh', marginBottom: '2vh' }}
                                defaultCenter={defaultCenter}
                                defaultZoom={2}
                                gestureHandling={'greedy'}
                                disableDefaultUI={true}
                                mapId={MAP_ID}
                            >
                                <MapComponent currentRunningCountry={currentRunningCountry} currentChasingCountry={currentChasingCountry} />
                            </Map>
                        </Flex>
                    </APIProvider>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Flex gap="large" wrap={false} justify='center' vertical={false}>
                        <Input
                            placeholder="Guess a country..."
                            value={playerGuess}
                            onChange={handleGuessChange}
                            onKeyPress={handleKeyPress}
                            disabled={isAnimating.chasing} // Disable input when chasing marker is animating
                        />
                        <Button type="primary" onClick={handleGuessSubmit} disabled={isAnimating.chasing}>Submit</Button> {/* Disable button when chasing marker is animating */}
                    </Flex>
                    <List
                        itemLayout="horizontal"
                        dataSource={log}
                        renderItem={(item, index) => (
                        <List.Item>
                            <List.Item.Meta
                            avatar={item.player === 'Bash' ? <RunningMarkerSVG width={20} height={20} /> : <ChasingMarkerSVG width={20} height={20} />}
                            description={`${item.player} travelled to ${item.player === 'Bash' ? item.country.replace(/[a-zA-Z]/g, '*') : item.country} in ${item.region}`}
                            />
                        </List.Item>
                        )}
                    />
                    </Space>
                </div>
            )}
        </>
    );
};

export default WorldMap;
