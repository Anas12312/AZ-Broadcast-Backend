module.exports = (socket, io) => {+
    console.log("a7a")
    const roomId = parseInt(Math.random() * 1000000).toString()
    socket.join(roomId)
    socket.emit("created", {
        roomId
    })
    socket.emit("room-created", {
        roomId,
        members: Array.from(io.sockets.adapter.rooms.get(roomId))
    })
}