import dotenv from 'dotenv'
dotenv.config()
import express, { Request, Response } from 'express'
import socket, { Socket } from 'socket.io'
import http from 'http'
import { SocketState, User } from './types/SocketState';
import { roomHandler } from './Handlers/roomHandler';
import { userHandler } from './Handlers/userHandler';
import imageRouter from './Routers/ImageRouter';
import cors from 'cors'
import { Stream, pipeline } from 'stream';
import streamRouter from './Routers/StreamRouter';
import cloudinary from 'cloudinary'
import searchRouter from './Routers/searchRouter';
import { QueueFactory } from './Queue/QueueFactory';
import { UserCounter } from './types/UserCounter';
import { RoomCounter } from './types/RoomCounter';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const proxyAgent = ytdl.createProxyAgent({
    uri: 'http://HcNQTDgZdNpUBj0:RWCXCouksIAC20L@176.103.229.25:43901'
})

async function downloadVideoAsMP3(videoUrl: string, outputPath: string) {
    try {
        console.log('Getting video info...');
        
        // Try to get info without proxy first
        let info;
        try {
            info = await ytdl.getBasicInfo(videoUrl);
            console.log('Video info retrieved without proxy');
        } catch (infoError) {
            console.log('Failed to get info without proxy, trying with proxy...');
            info = await ytdl.getBasicInfo(videoUrl, { agent: proxyAgent });
            console.log('Video info retrieved with proxy');
        }
        
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        console.log('Video title:', title);
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        const outputFilePath = `${outputPath}/${title}.mp3`;
        console.log('Output path:', outputFilePath);

        console.log('Starting audio stream download...');
        // Try without proxy first
        let audioStream;
        try {
            audioStream = ytdl(videoUrl, {
                quality: 'highestaudio',
                filter: 'audioonly'
            });
            console.log('Using stream without proxy');
        } catch (streamError) {
            console.log('Failed to create stream without proxy, trying with proxy...');
            audioStream = ytdl(videoUrl, {
                quality: 'highestaudio',
                filter: 'audioonly',
                agent: proxyAgent
            });
            console.log('Using stream with proxy');
        }

        audioStream.on('error', (err) => {
            console.error('Audio stream error:', err);
        });

        return new Promise((resolve, reject) => {
            ffmpeg(audioStream)
                .audioBitrate(128)
                .on('end', () => {
                    console.log('Download and conversion completed successfully');
                    resolve(outputFilePath);
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .save(outputFilePath);
        });
    } catch (error) {
        console.error('Error in downloadVideoAsMP3:', error);
        throw error;
    }
}

// Try with a different video URL
// downloadVideoAsMP3('https://www.youtube.com/watch?v=JGwWNGJdvx8', './downloads')
//     .then(filePath => {
//         console.log('File saved successfully at:', filePath);
//     })
//     .catch(error => {
//         console.error('Failed to download video:', error);
//     });

let USER_COUNT: UserCounter = {
    users: [],
    _count: 0
};
export const add_USER_COUNT = (username: string) => {
    ROOM_COUNT._count++;
}
export const minus_USER_COUNT = (username: string) => {
    ROOM_COUNT._count--;
}

let ROOM_COUNT: RoomCounter = {
    rooms: [],
    _count: 0
};
export const add_ROOM_COUNT = (roomId: string) => {
    ROOM_COUNT.rooms.push({
        roomId
    })
    ROOM_COUNT._count++;
}
export const minus_ROOM_COUNT = (roomId: string) => {
    ROOM_COUNT.rooms.filter((x) => x !== roomId);
    ROOM_COUNT._count--;
}

const app = express();
app.use(express.json())
app.use(cors())


app.use(imageRouter);
app.use(streamRouter);
app.use(searchRouter);

const server = http.createServer(app);

const io = new socket.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
})

// On Connection
const onConnection = (socket: Socket) => {



    socket.on('init', (data) => {

        let user: User = {
            username: data.username,
            image: data.image
        };

        socket.data = user;
        add_USER_COUNT(user.username);
    })

    roomHandler(io, socket);
    userHandler(io, socket);

    socket.on('disconnecting', () => {
        minus_USER_COUNT(socket.data.username);

        socket.rooms.forEach(async roomId => {

            socket.leave(roomId);
            const queue = QueueFactory.getQueue(roomId);
            queue?.removeClient(socket.id);

            io.to(roomId).emit('member-left', {
                member: socket.id,
                memberUsername: socket.data.username,
                members: (await io.in(roomId).fetchSockets()).map(socket => socket.data)
            })

        })
    })
}

(async () => {
    io.on("connection", onConnection)
})();

const port = process.env.PORT || 4000;

app.get("/counr", async (req: Request, res: Response) => {
    res.send({
        users: {
            _count: USER_COUNT._count,
            users: (await io.sockets.fetchSockets()).map(x => x.data.username)
        },
        rooms: ROOM_COUNT
    })
})


server.listen(port, () => {
    console.log("Server Running on port: " + port)
})

export { io };