"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomHandler = void 0;
const roomHandler = (io, socket, state) => {
    const { users } = state;
    socket.on("create", () => {
        const roomId = Math.floor(Math.random() * 1000000) + '';
        socket.join(roomId);
        socket.emit("created", {
            roomId
        });
        const room = io.sockets.adapter.rooms.get(roomId);
        const members = Array.from(room).map(id => {
            return {
                username: users[id].username,
                image: users[id].image
            };
        });
        socket.emit("room-created", {
            roomId,
            members
        });
    });
    socket.on("join", (data) => {
        if (io.sockets.adapter.rooms.get(data.roomId)) {
            socket.join(data.roomId);
            socket.emit("joined", {
                message: "done",
                roomId: data.roomId
            });
            io.to(data.roomId).emit('member-joined', {
                member: socket.id,
                memberUsername: users[socket.id].username,
                members: Array.from(io.sockets.adapter.rooms.get(data.roomId)).map(u => {
                    return {
                        username: users[u].username,
                        image: users[u].image
                    };
                })
            });
        }
        else {
            socket.emit("error", {
                message: "This Room Doesn't Exist"
            });
        }
    });
    socket.on("leave", (data) => {
        socket.leave(data.roomId);
        if (io.sockets.adapter.rooms.get(data.roomId)) {
            io.to(data.roomId).emit('member-left', {
                member: socket.id,
                memberUsername: users[socket.id].username,
                members: Array.from(io.sockets.adapter.rooms.get(data.roomId)).map(u => {
                    return {
                        username: users[u].username,
                        image: users[u].image
                    };
                })
            });
        }
    });
    socket.on("message_send", (data) => {
        if(data.roomId) {
            if (Array.from(io.sockets.adapter.rooms.get(data.roomId)).includes(socket.id)) {
                socket.to(data.roomId).emit("message_recieved", {
                    message: data.message,
                    sender: socket.id,
                    senderUsername: users[socket.id].username,
                });
            }
        }
    });
};
exports.roomHandler = roomHandler;
