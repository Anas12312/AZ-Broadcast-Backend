module.exports = (data, socket, io, usernames) => {
    if(Array.from(io.sockets.adapter.rooms.get(data.roomId)).includes(socket.id)) {
        socket.to(data.roomId).emit("message_recieved", {
            message: data.message,
            sender: socket.id,
            senderUsername: usernames[socket.id].username,
        })
    }
}