import { Server, Socket } from "socket.io"

export const musicHanlder = (io: Server, socket: Socket) => {

    socket.on('music', (data) => {
        
    })

} 