import { Response } from "express";
import Ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { Throttle } from "stream-throttle";
import { v4 as uuidv4 } from 'uuid'
import ytdl from "ytdl-core";


interface Track {
    url: string,
    bitrate: number
}

export class QueueFactory {

    private static instances: QueueFactory[] = [];

    private roomId: string;
    private clients: Map<string, PassThrough>;
    private tracks: string[];
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

    addClient() {
        const id = uuidv4();
        const client = new PassThrough();
        this.clients.set(id, client);
        return { id, client };
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
            client.write(chunk);
        })
    }


    async loadCurrentTrack() {

        // if(!this.currentTrack && this.tracks[0]) {
        //     this.currentTrack = this.tracks[0];
        // }

        if(!this.currentTrack) {
            return;
        }

        if(this.stream) {
            this.stream.removeAllListeners()
            this.stream.end()
        }

        console.log(this.currentTrack);

        const info = await ytdl.getInfo(this.currentTrack);
    
        const format = ytdl.chooseFormat(info.formats, {quality:'highestaudio'})
        
        this.throttle = new Throttle({ rate: (200 * 1024) / 8 });
    
        const youtube = ytdl(this.currentTrack, {quality:'highestaudio', highWaterMark: 1 << 25});
        
        this.stream = Ffmpeg(youtube).format('mp3').audioBitrate(format.audioBitrate!).pipe(this.throttle) as PassThrough;
    }

    nextTrack() {
        if(!this.started() && this.tracks[0]) {
            this.currentTrack = this.tracks[0];
            return;
        } 

        this.index = (this.index + 1) % this.tracks.length;
        // load to next track
        this.currentTrack = this.tracks[this.index];
        return;
    }

    started() {
        return this.stream && this.throttle && this.currentTrack;
    }

    start() {
        if(!this.stream) return;

        this.playing = true;

        this.stream
            .on('data', (chunk) => this.broadcast(chunk))
            .on('finish', () => {
                this.play()
            })
            .on('error', (e) => {
                console.log(this.roomId ,e);
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
        if(!this.stream) return;
        this.playing = false;
        this.stream.pause();
    }

    resume() {
        if (!this.started() || this.playing) return;
        if(!this.stream) return;
        this.stream.resume();
    }

    addTrack(trackUrl: string) {
        this.tracks.push(trackUrl);
        if(!this.currentTrack) {
            this.currentTrack = this.tracks[0];
        }
        console.log(this.tracks);
        // if(!this.started()) this.play();
    }

    modifiyTracks(newTracks: string[]) {
        this.tracks = newTracks;
    }

    skip() {
        this.pause();
        // this.nextTrack();
        this.play();
    }

}