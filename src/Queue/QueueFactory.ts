import { Response } from "express";
import Ffmpeg from "fluent-ffmpeg";
import { Socket } from "socket.io";
import { PassThrough } from "stream";
import { Throttle } from "stream-throttle";
import { v4 as uuidv4 } from 'uuid'
import ytdl from "@distube/ytdl-core";
import { io, minus_ROOM_COUNT } from "..";
import FfmpegPath from '@ffmpeg-installer/ffmpeg'
import fs from 'fs'
import path from 'path'
import { HttpsProxyAgent } from 'https-proxy-agent';

// Set ffmpeg path
Ffmpeg.setFfmpegPath(FfmpegPath.path)

// Set proxy agent
// const proxy = 'http://brd-customer-hl_4e80773d-zone-datacenter_proxy1:ffhxed0lbnx6@brd.superproxy.io:33335'
// const newProxy = 'http://brd-customer-hl_4e80773d-zone-web_unlocker1:ucr25g0v8osh@brd.superproxy.io:33335'
// const username = 'testytdl_UxbVX'
// const password = '86wd_W2J=TCcPgN'
// const oxyLabProxy = `https://${username}:${password}@unblock.oxylabs.io:60000`
// const staticProxy = 'http://177.234.241.25:999'
const cookies = JSON.parse(fs.readFileSync(path.join(__dirname, '../../cockies.json'), 'utf-8'))

// const agent = ytdl.createProxyAgent({
//     uri: staticProxy
// }, cookies)

const cookieAgent = ytdl.createAgent(cookies)

const proxyAgent = ytdl.createProxyAgent({
    uri: 'http://HcNQTDgZdNpUBj0:RWCXCouksIAC20L@176.103.229.25:43901'
})

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
    private currentIndex: number = 0;
    private currentTrackId: string = '';
    private currentTrack: Track | undefined;

    private loop: boolean = false;
    private loop1: boolean = false;
    private loopTrackId: string = '';

    private stream: PassThrough | undefined;
    private playing: boolean = false;
    private throttle: Throttle | undefined;

    private commadBusy: boolean = false;

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
        const queue = QueueFactory.instances.filter(x => !(x.roomId === roomId));

        QueueFactory.instances = queue;

        console.log(roomId, 'deleted');
        minus_ROOM_COUNT(roomId);
    }

    async addClient(socketId: string) {

        if (this.clients.has(socketId)) {
            return { id: socketId, broadcastClient: this.clients.get(socketId)! };
        }

        const client = new PassThrough();

        const socket = (await io.in(this.roomId).fetchSockets()).find(x => x.id === socketId);

        if (!socket) return;

        const broadcastClient: BroadcastClient = {
            httpClient: client,
            socket: socket
        }

        this.clients.set(socketId, broadcastClient);
        return { id: socketId, broadcastClient };
    }

    removeClient(socketId: string): Boolean {
        if (this.clients.has(socketId)) {
            this.clients.delete(socketId);

            if (!this.clients.size) {
                this.terminate();
                QueueFactory.deleteQueue(this.roomId);
            }

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

        if (!currentTrack) return;

        if (this.stream) {
            this.stream.removeAllListeners()
            this.stream.end()
        }

        // this.throttle = new Throttle({ rate: (145 * 1024) / 8 });

        try {
            this.throttle = new Throttle({ rate: currentTrack.currentTrack.bitrate! / 8 })
                .on('error', (e: Error) => {
                    console.log('Throttle: ', e);
                });

            // Try without proxy first
            let youtube;
            try {
                console.log('Trying to stream without proxy...');
                youtube = ytdl(currentTrack.currentTrack.url, {
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25
                });
                console.log('Successfully created stream without proxy');
            } catch (streamError) {
                console.log('Failed to stream without proxy, trying with proxy...', streamError);
                youtube = ytdl(currentTrack.currentTrack.url, {
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25,
                    agent: proxyAgent
                });
                console.log('Successfully created stream with proxy');
            }

            youtube.on('error', (e: Error) => {
                console.log('YouTube stream error:', e);
                if (e.message.includes('Status code: 400')) {
                    console.log('This might be due to region restrictions or the video being unavailable');
                    this.nextTrack();
                    this.play();
                }
            });

            youtube.on('progress', (chunkLength: number, downloaded: number, total: number) => {
                const percent = downloaded / total;
                console.log(`Stream progress for ${currentTrack.currentTrack.name}: ${(percent * 100).toFixed(2)}%`);
            });

            this.stream = Ffmpeg(youtube, {
                // ffmpegPath: FfmpegPath.path
            })
                .format('mp3')
                .on('error', (err: Error) => {
                    console.log('FFmpeg error:', err);
                    this.nextTrack();
                    this.play();
                })
                .pipe(this.throttle) as PassThrough;

            return currentTrack.currentTrack.duration;
        } catch (e) {
            console.log('Error in loadCurrentTrack:', e);
            this.nextTrack();
            this.loadCurrentTrack();
            this.start();
        }
    }

    private nextTrack() {
        if (!this.started() && this.tracks[0]) {
            this.currentTrackId = this.tracks[0].id;
            this.currentIndex = 0;
            return;
        }

        const currentTrack = this.getCurrentTrack();

        if (!currentTrack) return;

        const { currentTrack: track, index } = currentTrack;

        // if(this.loop1 && this.loopTrackId) {
        //     this.currentIndex = index;
        //     this.currentTrackId = this.tracks[this.currentIndex].id;            
        //     return;
        // }        

        this.currentIndex = (index + 1) % this.tracks.length;

        this.currentTrackId = this.tracks[this.currentIndex].id;
        return;
    }

    private getCurrentTrack() {
        let currentTrack: Track | undefined;
        let index: number = NaN;

        if (!this.currentTrackId) return undefined;

        this.tracks.forEach((track, i) => {
            if (track.id === this.currentTrackId) {
                currentTrack = track;
                index = i;
            }
        })

        if (!currentTrack) {
            return undefined
        }

        return { currentTrack, index };
    }

    private started() {
        return this.stream && this.throttle && this.getCurrentTrack();
    }

    private start(delayTime: number = 0) {
        this.commadBusy = false;

        if (!this.stream) return;

        this.playing = true;

        this.stream
            .on('data', (chunk) => this.broadcast(chunk))
            .on('finish', () => {
                setTimeout(() => {
                    io.in(this.roomId).emit('track-ended');
                    this.play()
                }, delayTime * 1000 * 0.2)
            })
            .on('error', (e) => {
                this.play();
            });
    }

    async play() {
        if (this.clients.size === 0) {
            this.terminate();
            QueueFactory.deleteQueue(this.roomId);
            return
        }

        // if(!this.loop && this.currentIndex === this.tracks.length -1) return;

        io.in(this.roomId).emit('played');
        this.nextTrack();
        const delayTime = await this.loadCurrentTrack();
        this.start(delayTime);
    }

    async playAPI(socketId: string, trackId: string) {
        if (this.commadBusy) return;
        this.commadBusy = true;

        // if(this.loop1) {
        //     this.loop1 = false;
        //     this.loopTrackId = '';
        // }

        const track = this.tracks.find(x => x.id === trackId);
        if (!track) return;
        const index = this.tracks.findIndex(x => x.id === trackId);

        this.pause();

        this.currentTrackId = track.id;
        this.currentIndex = index;

        io.in(this.roomId).emit('played');

        await this.loadCurrentTrack();
        this.start();

        const socket = this.clients.get(socketId);
        if (!socket) return;
        io.in(this.roomId).emit('track_palyed', `${socket.socket.data.username} played ${track.name}.`);

        this.commadBusy = false;
    }

    private pause() {
        if (!this.started() || !this.playing) return;
        if (!this.stream) return;
        this.playing = false;
        this.stream.pause();
    }

    terminate() {
        this.pause();

        this.playing = false;

        this.throttle = undefined;
        this.stream = undefined;

        this.currentIndex = 0;
        this.currentTrackId = '';

        this.loop = false;
        this.loop1 = false;
        this.loopTrackId = '';
    }

    terminateAPI(socketId: string) {
        this.pause();

        this.playing = false;

        this.throttle = undefined;
        this.stream = undefined;

        this.currentIndex = 0;
        this.currentTrackId = '';

        const socket = this.clients.get(socketId);
        if (!socket) return;
        io.in(this.roomId).emit('tracks_terminated', `${socket.socket.data.username} terminated the queue.`);
    }

    pauseAPI(socketId: string) {
        if (this.commadBusy) return;
        this.commadBusy = true;

        if (!this.started() || !this.playing) return;
        if (!this.stream) return;
        this.playing = false;
        this.stream.pause();

        const socket = this.clients.get(socketId);
        if (!socket) return;
        io.in(this.roomId).emit('track_paused', `${socket.socket.data.username} paused the queue.`);

        this.commadBusy = false;
    }

    resume(socketId: string) {
        if (!this.started() || this.playing) return;
        if (!this.stream) return;
        this.stream.resume();

        const socket = this.clients.get(socketId);
        if (!socket) return;
        io.in(this.roomId).emit('track_resumed', `${socket.socket.data.username} resumed the queue.`);
    }

    async addTrack(trackUrl: string, socketId: string) {

        const socket = this.clients.get(socketId);

        if (!socket) return;

        // prevent same track addition
        if (this.tracks.filter((t) => {
            return t.url === trackUrl
        }).length) {
            return;
        }

        try {
            // Try without proxy first
            let info;
            try {
                console.log('Getting track info without proxy...');
                info = await ytdl.getInfo(trackUrl);
                console.log('Successfully retrieved info without proxy');
            } catch (infoError) {
                console.log('Failed to get info without proxy, trying with proxy...', infoError);
                info = await ytdl.getInfo(trackUrl, {
                    agent: proxyAgent
                });
                console.log('Successfully retrieved info with proxy');
            }

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
        } catch (error: any) {
            console.error('Error adding track:', error);
            io.in(this.roomId).emit('track_error', `Failed to add track: ${error.message}`);
        }
    }

    modifiyTracks(newTracks: Track[], socketId: string) {
        if (this.commadBusy) return;
        this.commadBusy = true;

        if (!newTracks.length) {
            this.terminateAPI(socketId);
            return;
        }

        this.tracks = newTracks;

        const current = this.getCurrentTrack();

        if (!current) return;

        const { index } = current;

        this.currentIndex = index;

        io.in(this.roomId).emit('modified');

        this.commadBusy = false;
    }

    skip(socketId: string) {
        if (this.commadBusy) return;
        this.commadBusy = true;

        if (!this.started()) return;

        this.pause();
        this.play();

        const socket = this.clients.get(socketId);
        if (!socket) return;

        io.in(this.roomId).emit('track_skiped', `${socket.socket.data.username} skiped a track.`);

        this.commadBusy = false;

    }

    async prev(socketId: string) {
        if (this.commadBusy) return;
        this.commadBusy = true;

        if (!this.started()) return;

        if (this.currentIndex == 0) {
            this.currentIndex = this.tracks.length - 1
            this.currentTrackId = this.tracks[this.currentIndex].id;
        } else if (this.currentIndex == 1) {
            this.currentIndex = this.tracks.length - 1
            this.currentTrackId = this.tracks[this.currentIndex].id;
        } else {
            this.currentIndex -= 2;
            this.currentTrackId = this.tracks[this.currentIndex].id;
        }

        const currentTrack = this.getCurrentTrack();
        if (!currentTrack) return;

        this.currentTrackId = currentTrack.currentTrack.id;

        this.pause();
        if (this.clients.size === 0) {
            this.terminate();
            QueueFactory.deleteQueue(this.roomId);
            return
        }

        // if(!this.loop && this.currentIndex === this.tracks.length -1) return;

        io.in(this.roomId).emit('played');
        const delayTime = await this.loadCurrentTrack();
        this.start(delayTime);

        const socket = this.clients.get(socketId);
        if (!socket) return;
        io.in(this.roomId).emit('track_preved', `${socket.socket.data.username} preved a track.`);

        this.commadBusy = false;
    }

    getTracks() {
        return {
            tracks: this.tracks,
            currentTrack: this.getCurrentTrack()?.index
        };
    }

    removeTrack(id: string, socketId: string) {
        if (this.commadBusy) return;
        this.commadBusy = true;


        const currentTrack = this.getCurrentTrack();

        if (!currentTrack) return;

        const { currentTrack: track, index } = currentTrack;

        if (track.id === id) {
            io.in(this.roomId).emit('removed');
            this.pause();

            if (index === 0) {
                this.currentIndex = 0;
                this.currentTrackId = this.tracks[this.currentIndex].id;
            } else if (index === this.tracks.length - 1) {
                this.currentIndex = this.tracks.length - 2;
                this.currentTrackId = this.tracks[this.currentIndex].id;
            } else {
                this.currentIndex = this.currentIndex - 1;
                this.currentTrackId = this.tracks[this.currentIndex].id;
            }
            this.tracks = this.tracks.filter((x) => x.id !== id);
            this.play();
        } else {
            io.in(this.roomId).emit('removed');
            this.tracks = this.tracks.filter((x) => x.id !== id);
        }


        const socket = this.clients.get(socketId);
        if (!socket) return;
        io.in(this.roomId).emit('track_removed', `${socket.socket.data.username} removed a track.`);

        this.commadBusy = false;
    }

    loopAPI(socketId: string, loop: boolean) {
        // if(this.commadBusy) return;
        // this.commadBusy = true;

        // this.loop = loop;

        // if(!loop && this.loop1) {
        //     this.loop1 = false;
        //     this.loopTrackId = '';
        // }

        // const socket = this.clients.get(socketId);
        // if(!socket) return;
        // io.in(this.roomId).emit(loop ? 'tracks_looped' : 'tracks_unlooped', `${socket.socket.data.username} ${loop ? 'looped' : 'unlooped'} the playlist.`);

        // this.commadBusy = false;
    }

    loopOneAPI(socketId: string) {
        // if(this.commadBusy) return;
        // this.commadBusy = true;

        // const track = this.tracks.find(x => x.id === this.currentTrackId);

        // if(!track) return;

        // this.loop1 = true;

        // this.loopTrackId = track.id;

        // const socket = this.clients.get(socketId);
        // if(!socket) return;
        // io.in(this.roomId).emit('tracks_looped', `${socket.socket.data.username} the playlist.`);  

        // this.commadBusy = false;
    }

    // getStatusAPI() {
    //     return {
    //         loop: this.loop,
    //         loop1: this.loop1,
    //         loopTrackId:this.loopTrackId
    //     }
    // }
}