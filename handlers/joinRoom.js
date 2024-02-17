module.exports = (data, socket, io) => {
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
}