import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Weather from '../Weather/Weather';
import { toast, ToastContainer } from 'react-toastify';

const RocketList = () => {
    const [rockets, setRockets] = useState([]);
    const [telemetryData, setTelemetryData] = useState({});
    const [rocketStatusOption, setRocketStatusOption] = useState(false);

    useEffect(() => {
        const fetchRockets = async () => {
            try {
                const response = await axios.get('http://localhost:5000/rockets', {
                    headers: {
                        'x-api-key': 'API_KEY_1',
                    },
                });
                console.log(response.data);
                setRockets(response.data);
                toast.success('Rocket data fetched successfully!', { position: 'top-center' });
            } catch (error) {
                console.error('Error fetching rocket data:', error);
                toast.error('Failed to fetch rocket data', { position: 'top-center' });
            }
        };

        initializeWebSocket();
        fetchRockets();
    }, []);

    const initializeWebSocket = () => {
        const ws = new WebSocket('ws://localhost:3000');

        ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setTelemetryData((prevData) => ({
                ...prevData,
                [data.rocketID]: data,
            }));
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            ws.close();
        };
    };

    const [selectedRocketId, setSelectedRocketId] = useState(null);
    const handleSelectRocket = (rocketId) => {
        setSelectedRocketId(rocketId);
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'cancelled':
                return 'text-red-400 text-xl';
            case 'deployed':
                return 'text-orange-500';
            case 'launched':
                return 'text-xl';
            default:
                return '';
        }
    };

    const [operation, setOperation] = useState(null);

    const handleOperation = (operationType) => {
        setOperation(operationType);
        setRocketStatusOption(true);
    };

    const confirmOperation = async (rocketId) => {
        try {
            const API_BASE_URL = 'http://localhost:5000';

            switch (operation) {
                case 'Launch': {
                    const response = await axios.put(`${API_BASE_URL}/rocket/${rocketId}/status/launched`, {}, {
                        headers: {
                            'x-api-key': 'API_KEY_1',
                        },
                    });
                    console.log(response.data);
                    const newStatus = response.data.status;
                    setRockets(prevRockets =>
                        prevRockets.map(rocket =>
                            rocket.id === rocketId ? { ...rocket, status: newStatus } : rocket
                        )
                    );
                    toast.success('Rocket launched successfully!', { position: 'top-center' });
                    break;
                }
                case 'Deploy': {
                    const response = await axios.put(`${API_BASE_URL}/rocket/${rocketId}/status/deployed`, {}, {
                        headers: {
                            'x-api-key': 'API_KEY_1',
                        },
                    });
                    console.log(response.data);
                    const newStatus = response.data.status;
                    setRockets(prevRockets =>
                        prevRockets.map(rocket =>
                            rocket.id === rocketId ? { ...rocket, status: newStatus } : rocket
                        )
                    );
                    toast.success('Rocket deployed successfully!', { position: 'top-center' });
                    break;
                }
                case 'Cancel': {
                    const response = await axios.delete(`${API_BASE_URL}/rocket/${rocketId}/status/launched`, {
                        headers: {
                            'x-api-key': 'API_KEY_1',
                        },
                    });
                    console.log(response.data);
                    const newStatus = response.data.status;
                    setRockets(prevRockets =>
                        prevRockets.map(rocket =>
                            rocket.id === rocketId ? { ...rocket, status: newStatus } : rocket
                        )
                    );
                    toast.success('Rocket cancelled successfully!', { position: 'top-center' });
                    break;
                }
                default:
                    return;
            }

            setRocketStatusOption(false);
            setOperation(null);
        } catch (error) {
            console.error('Operation failed', error);
            let errorMessage;
            if (error.response || error.response.data) {
                errorMessage = error.response.data.message;
            } else {
                errorMessage = 'An error occurred while processing the operation.';
            }

            switch (operation) {
                case 'Launch':
                    toast.error(`Launch error: ${errorMessage}`, { position: 'top-center' });
                    break;
                case 'Deploy':
                    toast.error(`Deploy error: ${errorMessage}`, { position: 'top-center' });
                    break;
                case 'Cancel':
                    toast.error(`Cancel error: ${errorMessage}`, { position: 'top-center' });
                    break;
                default:
                    toast.error('An unknown error occurred.', { position: 'top-center' });
                    break;
            }
        }
    };


    return (
        <div className='flex'>
            <div className="fixed top-0 left-0 w-80 h-screen bg-blue-900 text-white p-5 overflow-y-auto">
                <Weather />
                <h1 className="text-2xl mb-5 mt-10">Rocket List</h1>
                {rockets.length > 0 ? (
                    <ul>
                        {rockets.map((rocket) => (
                            <li key={rocket.id} className={`mb-5 p-4 rounded-lg ${selectedRocketId === rocket.id ? 'bg-green-700' : 'bg-blue-700'}`}>
                                <button onClick={() => handleSelectRocket(rocket.id)} className="bg-black text-white p-2 w-11/12 hover:opacity-50 rounded cursor-pointer">
                                    Select Rocket
                                </button>
                                {selectedRocketId && (
                                    <div className="fixed bottom-5 right-5 flex space-x-3">
                                        <button onClick={() => handleOperation('Launch')} className="bg-blue-500 text-white p-5 rounded">
                                            Launch
                                        </button>
                                        <button onClick={() => handleOperation('Deploy')} className="bg-yellow-500 text-white p-5 rounded">
                                            Deploy
                                        </button>
                                        <button onClick={() => handleOperation('Cancel')} className="bg-red-500 text-white p-5 rounded">
                                            Cancel
                                        </button>
                                    </div>
                                )}
                                {rocketStatusOption && (
                                    <>
                                        <div className="fixed inset-0 bg-black bg-opacity-5 z-40" onClick={() => setRocketStatusOption(false)}></div>
                                        <div className="fixed top-1/4 left-1/2 z-50 w-full max-w-xs p-5 bg-white rounded-lg shadow-lg transform -translate-x-1/2 -translate-y-1/2 text-center">
                                            <h1 className="font-bold p-5 text-black">Are you sure to proceed with this operation?</h1>
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => confirmOperation(selectedRocketId)} className="bg-blue-500 text-white p-3 rounded">Yes</button>
                                                <button onClick={() => setRocketStatusOption(false)} className="bg-red-500 text-white p-3 rounded">No</button>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <h2>{rocket.name}</h2>
                                <p>Model: {rocket.model}</p>
                                <p className={getStatusClass(rocket.status)}>Status: {rocket.status}</p>
                                <p>Payload Description: {rocket.payload.description}</p>
                                <p>Payload Weight: {rocket.payload.weight}</p>
                                {telemetryData[rocket.id] && (
                                    <div className="mt-3">
                                        <h3 className="text-lg mb-1">Telemetry Data:</h3>
                                        <p>Altitude: {telemetryData[rocket.id].altitude.toFixed(2)}</p>
                                        <p>Speed: {telemetryData[rocket.id].speed.toFixed(2)}</p>
                                        <p>Acceleration: {telemetryData[rocket.id].acceleration.toFixed(2)}</p>
                                        <p>Thrust: {telemetryData[rocket.id].thrust.toFixed(2)}</p>
                                        <p>Temperature: {telemetryData[rocket.id].temperature.toFixed(2)}</p>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No rockets available</p>
                )}



            </div>
         

        </div>
    );
};

export default RocketList;
