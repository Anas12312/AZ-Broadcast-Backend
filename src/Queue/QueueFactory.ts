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
    bitrate?: number,
    id: string
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
    private trackIndex: number = 0;
    private currentTrackId: string = '';
    private currentTrack: Track | undefined;

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

    private broadcast(chunk: any) {
        this.clients.forEach((client) => {
            client.httpClient.write(chunk);
        })
    }


    private async loadCurrentTrack() {

        const currentTrack = this.getCurrentTrack();

        if(!currentTrack) return;

        console.log('loaded');

        if (this.stream) {
            this.stream.removeAllListeners()
            this.stream.end()
        }

        // this.throttle = new Throttle({ rate: (145 * 1024) / 8 });

        this.throttle = new Throttle({ rate: currentTrack.currentTrack.bitrate! / 8 });


        const youtube = ytdl(currentTrack.currentTrack.url, { quality: 'highestaudio', highWaterMark: 1 << 25 });

        this.stream = Ffmpeg(youtube).format('mp3').pipe(this.throttle) as PassThrough;
    }

    private nextTrack() {
        if (!this.started() && this.tracks[0]) {
            this.currentTrackId = this.tracks[0].id;
            this.trackIndex = 0;
            return;
        }
    
        const currentTrack = this.getCurrentTrack();

        if(!currentTrack) return;

        const { currentTrack:track, index } = currentTrack;

        this.trackIndex = (index + 1) % this.tracks.length;
        // load to next track
        this.currentTrackId = this.tracks[this.trackIndex].id;

        return;
    }

    private getCurrentTrack() {
        let currentTrack: Track | undefined;
        let index: number = NaN;

        if(!this.currentTrackId) return undefined;

        this.tracks.forEach((track, i) => {
            if(track.id === this.currentTrackId) {
                currentTrack = track;
                index = i;
            }
        })

        if(!currentTrack) {
            return undefined
        }

        return { currentTrack, index };
    }

    private started() {
        return this.stream && this.throttle && this.getCurrentTrack();
    }

    private start() {
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
        io.in(this.roomId).emit('played');
        this.nextTrack();
        await this.loadCurrentTrack();
        this.start();
    }

    private pause() {
        if (!this.started() || !this.playing) return;
        if (!this.stream) return;
        this.playing = false;
        this.stream.pause();
    }

    terminate(socketId: string) {
        this.pause();

        this.playing = false;

        this.throttle = undefined;
        this.stream = undefined;

        this.trackIndex = 0;
        this.currentTrackId = '';

        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('tracks_terminated', `${socket.socket.data.username} terminated the queue.`);
    }

    pauseAPI(socketId: string) {
        if (!this.started() || !this.playing) return;
        if (!this.stream) return;
        this.playing = false;
        this.stream.pause();

        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_paused', `${socket.socket.data.username} paused the queue.`);
    }

    resume(socketId: string) {
        if (!this.started() || this.playing) return;
        if (!this.stream) return;
        this.stream.resume();

        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_resumed', `${socket.socket.data.username} resumed the queue.`);
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
            bitrate: format.bitrate,
            id: uuidv4()
        });

        if (!this.getCurrentTrack()) {
            this.currentTrackId = this.tracks[0].id;
        }

        if (!this.started()) this.play();
    }

    modifiyTracks(newTracks: Track[], socketId: string) {
        if(!newTracks.length) {
            this.terminate(socketId);
            return;
        }

        this.tracks = newTracks;
    }

    skip(socketId: string) {
        if(!this.started()) return;

        io.in(this.roomId).emit('skip');
        
        this.pause();
        this.play();
       
        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_skiped', `${socket.socket.data.username} skiped a track.`);
    }

    prev(socketId: string) {
        if (!this.started()) return;

        if (this.trackIndex == 0) {
            this.trackIndex = this.tracks.length - 1
        } else if (this.trackIndex == 1) {
            this.trackIndex = this.tracks.length - 1
        } else {
            this.trackIndex -= 2;
        }

        const currentTrack = this.getCurrentTrack();
        if(!currentTrack) return;

        this.currentTrackId = currentTrack.currentTrack.id;

        this.pause();
        this.play();

        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_preved', `${socket.socket.data.username} preved a track.`);
    }

    getTracks() {
        return {
            tracks: this.tracks,
            currentTrack: this.getCurrentTrack()?.index
        };
    }

    removeTrack(id: string, socketId: string) {

        this.pause();

        const currentTrack = this.getCurrentTrack();

        if(!currentTrack) return;

        const {currentTrack:track, index} = currentTrack;

        if(track.id === id) {
            
            if(index === this.tracks.length-1) {
                this.trackIndex = this.tracks.length-2;
                this.currentTrackId = this.tracks[this.trackIndex].id;
            }else {
                this.trackIndex = this.trackIndex-1;
                this.currentTrackId = this.tracks[this.trackIndex].id;
            }
        }

        this.tracks = this.tracks.filter((x) => x.id !== id);

        this.play();

        const socket = this.clients.get(socketId);
        if(!socket) return;
        io.in(this.roomId).emit('track_removed', `${socket.socket.data.username} removed a track.`);
    }

}