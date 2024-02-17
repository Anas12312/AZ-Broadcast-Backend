import express from 'express'
import socket, { Socket } from 'socket.io'
import http from 'http'
import { SocketState } from './types/SocketState';
import { roomHandler } from './Handlers/roomHandler';
import { userHandler } from './Handlers/userHandler';


const app = express();
const server = http.createServer(app);

const io = new socket.Server(server, {
    cors:{
        origin: '*',
        methods: ['GET', 'POST']
    }
})

// On Connection
const onConnection = (socket: Socket) => {
    
    const socketState: SocketState = {
        users: {},
        rooms: []
    }
    
    // Init user socket state
    if(!socketState.users[socket.id]) {
        socketState.users[socket.id] = {
            username : "USER" + Math.floor(Math.random() * 1000000)
        }
    }

    roomHandler(io, socket, socketState);
    userHandler(io, socket, socketState);
}

io.on("connection", onConnection)

const port = process.env.PORT || 4000;

server.listen(port, () => {
    console.log("Server Running on port: " + port)
})
