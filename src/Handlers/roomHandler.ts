import { Server, Socket } from "socket.io";
import { SocketState } from "../types/SocketState";
import { QueueFactory } from "../Queue/QueueFactory";
import { add_ROOM_COUNT } from "..";

export const roomHandler = (io: Server, socket: Socket) => {

    socket.on("create", () => {

        add_ROOM_COUNT();

        const roomId = Math.floor(Math.random() * 1000000) + '';
        socket.join(roomId);

        // Create queue for the room
        QueueFactory.createQueue(roomId);

        socket.timeout(100).emit("created", {
            roomId
        }, async () => {
            const sockets = await io.in(roomId).fetchSockets();
            const socketsData = sockets.map(socket => socket.data);

            io.in(roomId).emit('room-created', {
                roomId,
                members: socketsData
            });

        });



    })

    socket.on("join", (data) => {

        if(!data.roomId) {
            socket.emit("error", {
                message: "Invalid Room Id!"
            })
            return
        }

        if(!io.sockets.adapter.rooms.has(data.roomId)) {
            socket.emit("error", {
                message: "This Room Doesn't Exist!"
            })
            return
        }

        socket.join(data.roomId)

        socket.timeout(100).emit("joined", {
            message: "done",
            roomId: data.roomId
        }, async () => {
            io.to(data.roomId).emit('member-joined', {
                member: socket.id,
                memberUsername: socket.data.username,
                members: (await io.in(data.roomId).fetchSockets()).map(socket => socket.data)
            })
        })



        // if(data.roomId) {
        //     if (io.sockets.adapter.rooms.get(data.roomId)) {
        //         socket.join(data.roomId)
        //         socket.emit("joined", {
        //             message: "done",
        //             roomId: data.roomId
        //         })
        //         io.to(data.roomId).emit('member-joined', {
        //             member: socket.id,
        //             memberUsername: users[socket.id].username,
        //             members: Array.from(io.sockets.adapter.rooms.get(data.roomId)!).map(u => {
        //                 return {
        //                     username: users[u].username,
        //                     image: users[u].image
        //                 }
        //             })
        //         })
        //     } else {
        //         socket.emit("error", {
        //             message: "This Room Doesn't Exist"
        //         })
        //     }
        // }
    })

    socket.on("leave", async (data) => {

        if(!data.roomId) {
            socket.emit("error", {
                message: "Invalid Room Id!"
            })
            return
        }

        if(!io.sockets.adapter.rooms.has(data.roomId)) {
            socket.emit("error", {
                message: "This Room Doesn't Exist!"
            })
            return
        }

        socket.leave(data.roomId);
        const queue = QueueFactory.getQueue(data.roomId);
        queue?.removeClient(socket.id);


        io.to(data.roomId).emit('member-left', {
            member: socket.id,
            memberUsername: socket.data.username,
            members: (await io.in(data.roomId).fetchSockets()).map(socket => socket.data)
        })

        // if (data.roomId) {

        //     socket.leave(data.roomId)

        //     if (io.sockets.adapter.rooms.get(data.roomId)) {

        //         io.to(data.roomId).emit('member-left', {

        //             member: socket.id,
        //             memberUsername: users[socket.id].username,

        //             members: Array.from(io.sockets.adapter.rooms.get(data.roomId)!).map(u => {
        //                 return {
        //                     username: users[u].username,
        //                     image: users[u].image
        //                 }
        //             })
        //         })
        //     }
        // }
    })

    socket.on("message_send", (data) => {

        if(!data.roomId) {
            socket.emit("error", {
                message: "Invalid Room Id!"
            })
            return
        }

        if(!io.sockets.adapter.rooms.has(data.roomId)) {
            socket.emit("error", {
                message: "This Room Doesn't Exist!"
            })
            return
        }

        socket.to(data.roomId).emit("message_recieved", {
            message: data.message,
            sender: socket.id,
            senderUsername: socket.data.username,
            sernderImage: socket.data.image
        })

        // if (data.roomId) {
        //     if (io.sockets.adapter.rooms.get(data.roomId)) {

        //         socket.to(data.roomId).emit("message_recieved", {
        //             message: data.message,
        //             sender: socket.id,
        //             senderUsername: users[socket.id].username,
        //         })
        //     }
        // }
    })
}