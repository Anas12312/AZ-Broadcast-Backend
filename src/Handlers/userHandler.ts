import { Server, Socket } from "socket.io";
import { SocketState } from "../types/SocketState";

export const userHandler = (io: Server, socket: Socket, state: SocketState) => {
    
    const { users } = state

    socket.on("change_name", (data) => {
        //Change Username in memory
        users[socket.id] = {
            username: data.username,
            image: data.image
        };
        const rooms = Array.from(io.sockets.adapter.rooms);

        rooms.forEach(room => {
            if(room[1].has(socket.id)) {
                io.to(room[0]).emit('username_changed', {
                    members: Array.from(io.sockets.adapter.rooms.get(room[0])!).map(u => users[u])
                })
            }    
        })
    })
}