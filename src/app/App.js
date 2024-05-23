import React, { useState, useEffect, useCallback } from 'react';
import { Button, Flex, Input, message, Space, Progress, List } from 'antd';
import countriesData from './data/countries.json';
import { APIProvider, Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import RunningMarkerSVG from './assets/running-marker.svg';
import ChasingMarkerSVG from './assets/chasing-marker.svg';
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

    const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const MAP_ID = process.env.NEXT_PUBLIC_MAP_ID;

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
                const visitedCountryCodes = runningCountries.map(country => country.cca3);
                const borderCountries = currentRunningCountry.borders
                    .map(borderCode => countriesData.find(country => country.cca3 === borderCode))
                    .filter(borderCountry => borderCountry && !visitedCountryCodes.includes(borderCountry.cca3));

                if (borderCountries.length) {
                    const randomBorderIndex = Math.floor(Math.random() * borderCountries.length);
                    const nextCountry = borderCountries[randomBorderIndex];
                    setCurrentRunningCountry(nextCountry);
                    setRunningCountries(prev => [...prev, nextCountry]);
                    setLog(prev => [{ player: 'Bash', country: `${nextCountry.name.common}`, region: `${nextCountry.region}` }, ...prev].slice(0, 3));
                } else {
                    const unvisitedCountries = countriesData.filter(country => !visitedCountryCodes.includes(country.cca3));
                    if (unvisitedCountries.length) {
                        const randomUnvisitedIndex = Math.floor(Math.random() * unvisitedCountries.length);
                        const nextCountry = unvisitedCountries[randomUnvisitedIndex];
                        setCurrentRunningCountry(nextCountry);
                        setRunningCountries(prev => [...prev, nextCountry]);
                        setLog(prev => [{ player: 'Bash', country: `${nextCountry.name.common}`, region: `${nextCountry.region}` }, ...prev].slice(0, 3));
                    } else {
                        setCurrentRunningCountry(null);
                        setLog(prev => [{ player: 'Bash', country: 'Nowhere', region: 'Nowhere' }, ...prev].slice(0, 3));
                    }
                }
            }, 10000);

            return () => clearInterval(interval);
        }
    }, [currentRunningCountry, runningCountries]);

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
        }
    }, [currentRunningCountry, currentChasingCountry]);

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
            setProgress(0);
        } else {
            const guessedCountry = countriesData.find(country => country.name.common.toLowerCase() === playerGuess.toLowerCase());
            if (guessedCountry) {
                setCurrentChasingCountry(guessedCountry);
                setChasingCountries(prev => [...prev, guessedCountry]);
                // max 3 countries in list
                setLog(prev => [{ player: 'You', country: `${playerGuess}`, region: `${guessedCountry.region}` }, ...prev].slice(0, 3));
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
                {currentRunningCountry && (
                    <AdvancedMarker
                        position={{ lat: currentRunningCountry.latlng[0], lng: currentRunningCountry.latlng[1] }}
                        title={currentRunningCountry.name.common}
                        map={map}
                    >
                        <RunningMarkerSVG width={20} height={20} />
                    </AdvancedMarker>
                )}
                {currentChasingCountry && (
                    <AdvancedMarker
                        position={{ lat: currentChasingCountry.latlng[0], lng: currentChasingCountry.latlng[1] }}
                        title={currentChasingCountry.name.common}
                        map={map}
                    >
                        <ChasingMarkerSVG width={20} height={20} />
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
                        />
                        <Button type="primary" onClick={handleGuessSubmit}>Submit</Button>
                    </Flex>
                    <List
                        itemLayout="horizontal"
                        dataSource={log}
                        renderItem={(item, index) => (
                        <List.Item>
                            <List.Item.Meta
                            avatar={item.player === 'Bash' ? <RunningMarkerSVG width={20} height={20} /> : <ChasingMarkerSVG width={20} height={20} />}
                            // censor country with * for number of letters if player is bash
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
