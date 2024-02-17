module.exports = (data, socket, io, usernames) => {
    socket.leave(data.roomId)
        if(io.sockets.adapter.rooms.get(data.roomId)) {
            io.to(data.roomId).emit('member-left', {
                member: socket.id,
                memberUsername: usernames[socket.id].username,
                members: Array.from(io.sockets.adapter.rooms.get(data.roomId)).map(u => usernames[u].username)
            })
        }
}