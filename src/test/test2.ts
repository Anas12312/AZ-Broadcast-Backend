import express from 'express'
import { Throttle } from "stream-throttle";
import path from "path";
import ffmpeg from 'fluent-ffmpeg'
import ytdl from 'ytdl-core';
import { PassThrough } from 'stream';

(async () => {


    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=AjMfk5IJsSw');

    // const format = info.formats.filter(x => x.container === 'webm' && x.audioQuality === 'AUDIO_QUALITY_MEDIUM')[0];

    
    const format = ytdl.chooseFormat(info.formats, {quality:'highestaudio'})
    
    console.log(format);

    const throttle = new Throttle({ rate: format.bitrate! / 8 });

    
    const youtubeLive = ytdl('https://www.youtube.com/watch?v=AjMfk5IJsSw', {quality:'highestaudio'});
    
    const x = ffmpeg(youtubeLive).format('mp3').pipe(throttle) as PassThrough;

    const app = express();

    app.use(express.static(path.join(__dirname, './dist')))


    app.get('/stream', (req, res) => {
        // const headers = {
        //     'Cache-Control': 'no-cache, no-store',
        //     Connection: 'keep-alive',
        //     'Content-Type': 'audio/x-wav',
        //     Pragma: 'no-cache',
        // };
        // res.writeHead(200, headers);

        res.set({
            "Content-Type": 'audio/webm',
            "Transfer-Encoding": "chunked",
            "Connection": 'keep-alive',
            "Keep-Alive": 'timeout=999999'
        }).status(200);

        console.log('User joined stream');

        x.on('data', (chunck) => {
            res.write(chunck);
        })

        res.on('close', () => {
            console.log('User left the stream');
        })
    })

    app.get('/stop', (req, res) => {
        x.pause();
        res.send();
    })
    
    app.get('/resume', (req, res) => {
        x.resume();
        res.send();
    })

    app.listen(4000, () => {
        console.log('Listening...');
    })
})();