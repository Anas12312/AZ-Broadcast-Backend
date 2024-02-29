import { Response } from "express";
import Ffmpeg from "fluent-ffmpeg";
import { PassThrough } from "stream";
import { Throttle } from "stream-throttle";
import { v4 as uuidv4 } from 'uuid'
import ytdl from "ytdl-core";


export class QueueFactory {

    private static instances: QueueFactory[] = [];

    private roomId: string;
    private clients: Map<string, PassThrough>;
    private tracks: string[];

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


    async start() {
        const info = await ytdl.getInfo('https://www.youtube.com/watch?v=AjMfk5IJsSw');

        const format = ytdl.chooseFormat(info.formats, {quality:'highestaudio'})
        
        this.throttle = new Throttle({ rate: format.bitrate! / 8 });
    
        const youtube = ytdl('https://www.youtube.com/watch?v=AjMfk5IJsSw', {quality:'highestaudio'});
        
        this.stream = Ffmpeg(youtube).format('mp3').pipe(this.throttle) as PassThrough;

        this.stream.on('data', (chunk) => this.broadcast(chunk));
    }

    play() {

    }

    pause() {

    }

    resume() {

    }

}