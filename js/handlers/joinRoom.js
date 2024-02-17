module.exports = (data, socket, io, usernames) => {
    if(io.sockets.adapter.rooms.get(data.roomId)) {
        socket.join(data.roomId)
        socket.emit("joined", {
            message: "done",
            roomId: data.roomId
        })
        io.to(data.roomId).emit('member-joined', {
            member: socket.id,
            memberUsername: usernames[socket.id].username,
            members: Array.from(io.sockets.adapter.rooms.get(data.roomId)).map(u => usernames[u].username)
        })
    }else {
        socket.emit("error", {
            message: "This Room Doesn't Exist"
        })
    }
}