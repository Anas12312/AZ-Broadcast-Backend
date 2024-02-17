module.exports = (data, socket, io) => {
    socket.leave(data.roomId)
        if(io.sockets.adapter.rooms.get(data.roomId)) {
            io.to(data.roomId).emit('member-left', {
                member: socket.id,
                members: Array.from(io.sockets.adapter.rooms.get(data.roomId))
            })
        }
}