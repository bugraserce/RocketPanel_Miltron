const express = require('express');
const app = express();

const http = require('http');
const WebSocket = require('ws');
const dotenv = require('dotenv');
const rocketRouter = require('./routes/rocket');
const net = require('net');
const axios = require('axios');
const Buffer = require('buffer').Buffer;
const cors = require('cors')
const CircuitBreaker = require('opossum');



dotenv.config();

const corsOptions = {
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};


app.use(cors(corsOptions));

app.use(express.json());


const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const weatherServer = http.createServer();
const WEATHER_PORT = 5001;
const weatherWss = new WebSocket.Server({ server: weatherServer });
 // Port for the weather WebSocket server

const PORT = process.env.PORT || 5000;

const fetchWeatherData = async () => {
    try {
        const response = await axios.get('http://localhost:5000/weather', {
            headers: { 'x-api-key': 'API_KEY_1' },
        });
        const weatherData = response.data;
        weatherWss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(weatherData));
            }
        });
    } catch (error) {
        console.error('Error fetching weather data:', error);
    }
};

setInterval(fetchWeatherData, 10000); // Every 10 seconds



async function getRocketData() {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'http://localhost:5000/rockets',
        headers: {
            'x-api-key': 'API_KEY_1'
        }
    };

    try {
        const response = await axios.request(config);
        return response.data;
    } catch (error) {
        console.error('API error:', error);
        return [];
    }
}

const options = {
    timeout: 3000, // 3 sec timeout
    errorThresholdPercentage: 50, //cur open with %50 failure 
    resetTimeout: 10000 // after 10 sec cur is again closed
};

const cachedRockets = {};

async function getCachedRockets() {
    if (Object.keys(cachedRockets).length === 0) {
        const rockets = await getRocketData();
        rockets.forEach(rocket => {
            cachedRockets[rocket.id] = rocket;
        });
    }
    return Object.values(cachedRockets);
}
getCachedRockets()

const breaker = new CircuitBreaker(getRocketData, options);

// Function to decode the telemetry data according to the protocol
function decodeTelemetryData(data) {
    console.log('Data length:', data.length);
    console.log('Data:', data);

    if (data.length !== 0x24) {
        console.error('Invalid data length:', data.length);
        return null;
    }

    const packet = Buffer.from(data);

    const rocketID = packet.toString('utf8', 0x01, 0x0B);
    const packetNumber = packet.readUInt8(0x0B);
    const packetSize = packet.readUInt8(0x0C);

    // Adjusted to check for 0x14 since the data seems to have this value
    if (packetSize !== 0x14) {
        console.error('Invalid packet size:', packetSize);
        return null;
    }

    const altitude = packet.readFloatBE(0x0D);
    const speed = packet.readFloatBE(0x11);
    const acceleration = packet.readFloatBE(0x15);
    const thrust = packet.readFloatBE(0x19);
    const temperature = packet.readFloatBE(0x1D);
    const crc16 = packet.readUInt16BE(0x21);
    const delimiter = packet.readUInt8(0x23);

    if (delimiter !== 0x80) {
        console.error('Invalid packet delimiter:', delimiter);
        return null;
    }

    return {
        rocketID,
        packetNumber,
        altitude,
        speed,
        acceleration,
        thrust,
        temperature,
        crc16,
    };
}

// Function to connect to the telemetry system of a rocket
function connectToTelemetry(rocket) {
    const { host, port } = rocket.telemetry;

    const client = net.createConnection({ host, port }, () => {
        console.log(`Connected to telemetry system for rocket ${rocket.model}. Host: ${host}, Port: ${port}`);
    });

    client.on('data', (data) => {
        const telemetryData = decodeTelemetryData(data);
        if (telemetryData) {
            console.log(`Data from ${rocket.model} rocket:`, telemetryData);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(telemetryData));
                }
            });
        }
    });

    client.on('end', () => {
        console.log(`Telemetry connection ended for ${rocket.model} rocket.`);
    });

    client.on('error', (error) => {
        console.error(`Telemetry error for ${rocket.model} rocket:`, error);
    });
}

// Main function to retrieve rocket data and connect to their telemetry systems
async function main() {
    try {
        const rockets = await breaker.fire();
        rockets.forEach(connectToTelemetry);
    } catch (error) {
        console.error('Circuit breaker error:', error);
    }
}

main();

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


weatherServer.listen(WEATHER_PORT, () => {
    console.log(`Weather WebSocket server is running on port ${WEATHER_PORT}`);
});