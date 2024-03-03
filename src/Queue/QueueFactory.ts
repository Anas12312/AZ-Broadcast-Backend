import { Response } from "express";
import Ffmpeg from "fluent-ffmpeg";
import { Socket } from "socket.io";
import { PassThrough } from "stream";
import { Throttle } from "stream-throttle";
import { v4 as uuidv4 } from 'uuid'
import ytdl from "ytdl-core";
import { io } from "..";


export interface Track {
    url: string,
    name?: string,
    thumbnail?: string,
    duration?: number,
    author?: string,
    bitrate?: number
};

export interface BroadcastClient {
    socket: any,
    httpClient: PassThrough
}

export class QueueFactory {

    private static instances: QueueFactory[] = [];

    private roomId: string;
    private clients: Map<string, BroadcastClient>;
    private tracks: Track[];
    private currentTrack: string = '';
    private index: number = 0;

    private stream: PassThrough | undefined;
    private playing: boolean = false;
    private throttle: Throttle | undefined;

    private constructor(roomId: string) {
        this.roomId = roomId;
        this.clients = new Map();
        this.tracks = [];

    }

    static createQueue(roomId: string): QueueFactory {
        const queue = QueueFactory.instances.find(x => x.roomId === roomId);

        if (!queue) {
            const newQueue = new QueueFactory(roomId);
            QueueFactory.instances.push(newQueue);
            return newQueue;
        }

        return queue;
    }

    static getQueue(roomId: string): QueueFactory | undefined {
        const queue = QueueFactory.instances.find(x => x.roomId === roomId);

        if (!queue) {
            return undefined;
        }

        return queue;
    }

    static deleteQueue(roomId: string) {
        const queue = QueueFactory.instances.filter(x => !(x.roomId === roomId) );

        QueueFactory.instances = queue;
    }

    async addClient(socketId: string) {
        const client = new PassThrough();

        const socket = (await io.in(this.roomId).fetchSockets()).find(x => x.id === socketId);

        if(!socket) return;

        const broadcastClient: BroadcastClient = {
            httpClient: client,
            socket: socket
        }

        this.clients.set(socketId, broadcastClient);
        return {id: socketId ,broadcastClient};
    }

    removeClient(id: string): Boolean {
        if (this.clients.has(id)) {
            this.clients.delete(id);
            return true;
        }
        return false;
    }

    broadcast(chunk: any) {
        this.clients.forEach((client) => {
            client.httpClient.write(chunk);
        })
    }


    async loadCurrentTrack() {

        if (!this.currentTrack) {
            return;
        }

        if (this.stream) {
            this.stream.removeAllListeners()
            this.stream.end()
        }

        const track = this.tracks.find(x => x.url === this.currentTrack)!;

        // this.throttle = new Throttle({ rate: (145 * 1024) / 8 });

        this.throttle = new Throttle({ rate: track.bitrate! / 8 });


        const youtube = ytdl(track.url, { quality: 'highestaudio', highWaterMark: 1 << 25 });

        this.stream = Ffmpeg(youtube).format('mp3').pipe(this.throttle) as PassThrough;
    }

    nextTrack() {
        if (!this.started() && this.tracks[0]) {
            this.currentTrack = this.tracks[0].url;
            return;
        }

        this.index = (this.index + 1) % this.tracks.length;
        // load to next track
        this.currentTrack = this.tracks[this.index].url;
        return;
    }

    started() {
        return this.stream && this.throttle && this.currentTrack;
    }

    start() {
        if (!this.stream) return;

        this.playing = true;

        this.stream
            .on('data', (chunk) => this.broadcast(chunk))
            .on('finish', () => {
                this.play()
            })
            .on('error', (e) => {
                console.log(this.roomId, e);
                this.play();
            });
    }

    async play() {
        this.nextTrack();
        await this.loadCurrentTrack();
        this.start();
    }

    pause() {
        if (!this.started() || !this.playing) return;
        if (!this.stream) return;
        this.playing = false;
        this.stream.pause();
    }

    pauseAPI(socketId: string) {
        if (!this.started() || !this.playing) return;
        if (!this.stream) return;
        this.playing = false;
        this.stream.pause();

        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_added', `${socket.socket.data.username} paused the queue.`);
    }

    resume(socketId: string) {
        if (!this.started() || this.playing) return;
        if (!this.stream) return;
        this.stream.resume();

        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_added', `${socket.socket.data.username} resumed the queue.`);
    }

    async addTrack(trackUrl: string, socketId: string) {

        const socket = this.clients.get(socketId);

        if(!socket) return;

        const info = await ytdl.getInfo(trackUrl);

        io.in(this.roomId).emit('track_added', `${socket.socket.data.username} added ${info.videoDetails.title} to the queue.`);
        
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
        
        this.tracks.push({
            url: trackUrl,
            author: info.videoDetails.author.name,
            duration: +info.videoDetails.lengthSeconds,
            name: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            bitrate: format.bitrate
        });

        if (!this.currentTrack) {
            this.currentTrack = this.tracks[0].url;
        }

        if (!this.started()) this.play();
    }

    modifiyTracks(newTracks: Track[]) {
        this.tracks = newTracks;
    }

    skip(socketId: string) {
        io.in(this.roomId).emit('skip');
        
        this.pause();
        this.play();
       
        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_added', `${socket.socket.data.username} skiped a track.`);
    }

    prev(socketId: string) {
        if (!this.started()) return;

        if (this.index == 0) {
            this.index = this.tracks.length - 1
        } else if (this.index == 1) {
            this.index = this.tracks.length - 1
        } else {
            this.index -= 2;
        }
        this.currentTrack = this.tracks[this.index].url;

        this.pause();
        this.play();

        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_added', `${socket.socket.data.username} preved a track.`);
    }

    getTracks() {
        return {
            tracks: this.tracks,
            currentTrack: this.currentTrack
        };
    }

}