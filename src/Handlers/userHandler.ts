import { Server, Socket } from "socket.io";
import { SocketState } from "../types/SocketState";

export const userHandler = (io: Server, socket: Socket) => {

    socket.on("change_name", (data) => {
        //Change Username in memory

        if(!data.image || !data.username) {
            socket.emit('error', {
                message: 'Invalid Data!'
            })
        }

        socket.data = {
            username: data.username,
            image: data.image
        }

        socket.rooms.forEach(async (room) => {
            io.to(room).emit('username_changed', {
                members: (await io.in(room).fetchSockets()).map(socket => socket.data)
            })
        })

        // users[socket.id] = {
        //     username: data.username,
        //     image: data.image
        // };
        // const rooms = Array.from(io.sockets.adapter.rooms);

        // rooms.forEach(room => {
        //     if(room[1].has(socket.id)) {
        //         io.to(room[0]).emit('username_changed', {
        //             members: Array.from(io.sockets.adapter.rooms.get(room[0])!).map(u => users[u])
        //         })
        //     }    
        // })
    })
}