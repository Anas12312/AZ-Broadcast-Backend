import express from 'express'
import socket, { Socket } from 'socket.io'
import http from 'http'
import { SocketState, User } from './types/SocketState';
import { roomHandler } from './Handlers/roomHandler';
import { userHandler } from './Handlers/userHandler';
import imageRouter from './Routers/ImageRouter';
import cors from 'cors'

const app = express();
app.use(express.json())
app.use(cors())


app.use(imageRouter);

const server = http.createServer(app);

const io = new socket.Server(server, {
    cors:{
        origin: '*',
        methods: ['GET', 'POST']
    }
})

const socketState: SocketState = {
    users: {},
    rooms: []
}

// On Connection
const onConnection = (socket: Socket) => {
    
    socket.on('init', (data) => {
        
        let user: User = {
            username: data.username,
            image: ''
        };

        if(data.image) {
            user.image = data.image;
        }

        socketState.users[socket.id] = user;
    })

    roomHandler(io, socket, socketState);
    userHandler(io, socket, socketState);
}

io.on("connection", onConnection)

const port = process.env.PORT || 4000;

server.listen(port, () => {
    console.log("Server Running on port: " + port)
})
