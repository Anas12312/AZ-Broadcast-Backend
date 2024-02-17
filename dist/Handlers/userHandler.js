"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userHandler = void 0;
const userHandler = (io, socket, state) => {
    const { users } = state;
    socket.on("change_name", (data) => {
        //Change Username in memory
        users[socket.id] = Object.assign(Object.assign({}, users[socket.id]), { username: data.username });
        const rooms = Array.from(io.sockets.adapter.rooms);
        rooms.forEach(room => {
            if (Array.from(room[1]).includes(socket.id)) {
                io.to(room[0]).emit('username_changed', {
                    members: Array.from(io.sockets.adapter.rooms.get(room[0])).map(u => users[u].username)
                });
            }
        });
    });
};
exports.userHandler = userHandler;
