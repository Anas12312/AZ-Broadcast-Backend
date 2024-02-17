const express = require('express')
const socket = require('socket.io')
const http = require('http')
const cors = require('cors')
const app = express()
const server = http.createServer(app)
app.use(cors)
const io = new socket.Server(server, {
    cors:{
        origin: '*',
        methods: ['GET', 'POST']
    }
})
function findRooms() {
    var availableRooms = [];
    var rooms = io.sockets.adapter.rooms;
    if (rooms) {
        for (var room in rooms) {
            if (!rooms[room].hasOwnProperty(room)) {
                availableRooms.push(room);
            }
        }
    }
    return availableRooms;
}
io.on('connection', (socket) => {
    socket.on('create', () => {
        const roomId = parseInt(Math.random() * 1000000).toString()
        socket.join(roomId)
        socket.emit("created", {
            roomId
        })
        socket.emit("room-created", {
            roomId,
            members: Array.from(io.sockets.adapter.rooms.get(roomId))
        })
    })
    socket.on('join', (data) => {
        if(io.sockets.adapter.rooms.get(data.roomId)) {
            socket.join(data.roomId)
            socket.emit("joined", {
                message: "done",
                roomId: data.roomId
            })
            io.to(data.roomId).emit('member-joined', {
                member: socket.id,
                members: Array.from(io.sockets.adapter.rooms.get(data.roomId))
            })
        }else {
            socket.emit("error", {
                message: "This Room Doesn't Exist"
            })
        }
    })
    socket.on('leave', (data) => {
        socket.leave(data.roomId)
        if(io.sockets.adapter.rooms.get(data.roomId)) {
            io.to(data.roomId).emit('member-left', {
                member: socket.id,
                members: Array.from(io.sockets.adapter.rooms.get(data.roomId))
            })
        }
    })
    socket.on("message_send", (data) => {
        if(Array.from(io.sockets.adapter.rooms.get(data.roomId)).includes(socket.id)) {
            socket.to(data.roomId).emit("message_recieved", {
                message: data.message,
                sender: socket.id
            })
        }
    })

    socket.on("voice", function (data) {
        var newData = data.audio.split(";");
        newData[0] = "data:audio/ogg;";
        newData = newData[0] + newData[1];

        if(io.sockets.adapter.rooms.get(data.roomId)) {
            socket.to(data.roomId).emit("send", newData);
        }

    });

})

server.listen(3000, (server)=> {
    console.log("Server Running on port: " + 3000)
})