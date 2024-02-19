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
const ImageRouter_1 = __importDefault(require("./Routers/ImageRouter"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use(ImageRouter_1.default);
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
    socket.on('init', (data) => {
        let user = {
            username: data.username,
            image: ''
        };
        if (data.image) {
            user.image = data.image;
        }
        socketState.users[socket.id] = user;
    });
    (0, roomHandler_1.roomHandler)(io, socket, socketState);
    (0, userHandler_1.userHandler)(io, socket, socketState);
};
io.on("connection", onConnection);
const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log("Server Running on port: " + port);
});
