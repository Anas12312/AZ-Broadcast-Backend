"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = __importDefault(require("socket.io"));
const http_1 = __importDefault(require("http"));
const roomHandler_1 = require("./Handlers/roomHandler");
const userHandler_1 = require("./Handlers/userHandler");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.default.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const socketState = {
    users: {},
    rooms: []
};
// On Connection
const onConnection = (socket) => {
    // Init user socket state
    if (!socketState.users[socket.id]) {
        socketState.users[socket.id] = {
            username: "USER" + Math.floor(Math.random() * 1000000)
        };
    }
    (0, roomHandler_1.roomHandler)(io, socket, socketState);
    (0, userHandler_1.userHandler)(io, socket, socketState);
};
io.on("connection", onConnection);
const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log("Server Running on port: " + port);
});
