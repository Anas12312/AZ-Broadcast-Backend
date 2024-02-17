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
})

server.listen(3000, (server)=> {
    console.log("Server Running on port: " + 3000)
})