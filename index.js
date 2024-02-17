const express = require('express')
const socket = require('socket.io')
const http = require('http')
const cors = require('cors')
const createRoom = require('./handlers/createRoom')
const leaveRoom = require('./handlers/leaveRoom')
const sendMessage = require('./handlers/sendMessage')
const joinRoom = require('./handlers/joinRoom')
const app = express()
const server = http.createServer(app)
app.use(cors)
const io = new socket.Server(server, {
    cors:{
        origin: '*',
        methods: ['GET', 'POST']
    }
})
const usernames = { }
io.on('connection', (socket) => {
    if(!usernames[socket.id]) {
        usernames[socket.id] = {
            username : "USER" + parseInt(Math.random() * 1000).toString()
        }
    }
    socket.on('create', () => { createRoom(socket, io) })
    socket.on('join', (data) => { joinRoom(data, socket, io) })
    socket.on('leave', (data) => { leaveRoom(data, socket, io) })
    socket.on("message_send", (data) => { sendMessage(data, socket, io) })
    socket.on('change_name', (data) => { 

        //Change Username in memory
        usernames[socket.id] = {
            ...usernames[socket.id],
            username: data.username
        };

        const rooms = Array.from(io.sockets.adapter.rooms);

        rooms.forEach(room => {
            if(Array.from(room[1]).includes(socket.id)) {
                io.to(room[0]).emit('username_changed', {
                    members: Array.from(io.sockets.adapter.rooms.get(room[0])).map(u => usernames[u].username)
                })
            }    
        })

    })
})

const port = process.env.PORT || 4000;

server.listen(port, (server)=> {
    console.log("Server Running on port: " + port)
})