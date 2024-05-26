import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Weather = () => {
    const [weatherData, setWeatherData] = useState(null);

    useEffect(() => {
        const fetchWeatherData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/weather', {
                    headers: {
                        'x-api-key': 'API_KEY_1',
                    },
                });
                console.log(response.data);
                setWeatherData(response.data);
            } catch (error) {
                console.error('Error fetching weather data:', error);
            }
        };

        fetchWeatherData();

        // WebSocket connection
        const weatherSocket = new WebSocket('ws://localhost:5001');

        weatherSocket.onopen = () => {
            console.log('Connected to weather WebSocket server');
        };

        weatherSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setWeatherData(data);
        };

        weatherSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        weatherSocket.onclose = () => {
            console.log('Disconnected from weather WebSocket server');
        };

        // Cleanup WebSocket connection on component unmount
        return () => {
            weatherSocket.close();
        };
    }, []);

    return (
        <div>
            {weatherData && (
                <div className="fixed flex top-0 left-0 w-full bg-gray-900 text-white p-5">
                    <h1 className="text-2xl">Weather Information</h1>
                    <p>Temperature: {weatherData.temperature} °C</p>
                    <p>Humidity: {weatherData.humidity}</p>
                    <p>Pressure: {weatherData.pressure} hPa</p>
                    <p>Precipitation Probability: {weatherData.precipitation.probability}</p>
                    <p>Rain: {weatherData.precipitation.rain ? 'Yes' : 'No'}</p>
                    <p>Snow: {weatherData.precipitation.snow ? 'Yes' : 'No'}</p>
                    <p>Sleet: {weatherData.precipitation.sleet ? 'Yes' : 'No'}</p>
                    <p>Hail: {weatherData.precipitation.hail ? 'Yes' : 'No'}</p>
                    <p>Time: {new Date(weatherData.time).toLocaleString()}</p>
                    <p>Wind Direction: {weatherData.wind.direction}</p>
                    <p>Wind Angle: {weatherData.wind.angle}</p>
                    <p>Wind Speed: {weatherData.wind.speed} m/s</p>
                </div>
            )}
        </div>
    );
};

export default Weather;
