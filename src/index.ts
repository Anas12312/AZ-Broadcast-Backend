import express from 'express'
import socket, { Socket } from 'socket.io'
import http from 'http'
import { SocketState, User } from './types/SocketState';
import { roomHandler } from './Handlers/roomHandler';
import { userHandler } from './Handlers/userHandler';
import imageRouter from './Routers/ImageRouter';
import cors from 'cors'
import { Stream, pipeline } from 'stream';
import streamRouter from './Routers/StreamRouter';
import cloudinary from 'cloudinary'
import searchRouter from './Routers/searchRouter';

const app = express();
app.use(express.json())
app.use(cors())


app.use(imageRouter);
app.use(streamRouter);
app.use(searchRouter)

const server = http.createServer(app);

const io = new socket.Server(server, {
    cors:{
        origin: '*',
        methods: ['GET', 'POST']
    }
})

// On Connection
const onConnection = (socket: Socket) => {

    socket.on('init', (data) => {
        
        let user: User = {
            username: data.username,
            image: data.image
        };

        socket.data = user;
    })

    roomHandler(io, socket);
    userHandler(io, socket);
}

(async () => {
    io.on("connection", onConnection)
})();

const port = process.env.PORT || 4000;

server.listen(port, () => {
    console.log("Server Running on port: " + port)
})

export { io };