import ytdl from "ytdl-core";
import fs from 'fs';

// console.log('Running...');



// // const file = fs.createWriteStream('./beliverLow.mp3');

// // //Stream Vidoe content
// // ytdl('https://www.youtube.com/watch?v=gDXhFrYuZ7I', {filter:'audioonly', quality:'lowestaudio'})
// //     .on('data', (chunk) => {
// //         file.write(chunk);
// //         console.log(chunk.length);
// //     })
// //     .on('end', () => {
// //         console.log('end');
// //         file.close();
// //     })



// // // GET Video Info & Thumbnail
// // ytdl.getBasicInfo('https://www.youtube.com/watch?v=rIKE6ktK-Yw')
// //     .then(res => {
// //         const newRes = {
// //             ...res,
// //             player_response: []
// //         }

// //         console.log(newRes.videoDetails.thumbnails[0]);
// //         console.log(newRes.videoDetails.title);
// //         console.log(newRes.videoDetails.lengthSeconds);
// //     });


// // FFmpeg Full command
// // import ffmpeg from 'fluent-ffmpeg';

// // let bitrate ;

// // ffmpeg.ffprobe('./test2.mp3', function (err, metadata) {
// //     console.log(2 , metadata.format.bit_rate);

// //     bitrate = metadata.format.bit_rate;
// // })

// // console.log(bitrate);



// // import { ffprobe } from '@dropb/ffprobe'

// // (async () => {

// //     let bit = (await ffprobe('./beliverLow.mp3')).format.bit_rate;
// //     console.log(bit);

// //     bit = (await ffprobe('./test2.mp3')).format.bit_rate;
// //     console.log(bit);

// // })();

// // FOR LOW QUALITY AUDIO BIT_RATE ~= 50000




import { createServer, get } from 'http'
import { Throttle } from "stream-throttle";
import { Readable, Transform } from "stream";
import express from 'express';
import path from "path";

const app = express();


// // const file = fs.createWriteStream('./beliverLow.mp3');

// // //Stream Vidoe content
// // ytdl('https://www.youtube.com/watch?v=gDXhFrYuZ7I', {filter:'audioonly', quality:'lowestaudio'})
// //     .on('data', (chunk) => {
// //         file.write(chunk);
// //         console.log(chunk.length);
// //     })
// //     .on('end', () => {
// //         console.log('end');
// //         file.close();
// //     })

// // const readableMusic = fs.createReadStream('./test2.mp3');

// // const readableMusic = Readable.from('helloooooooo', {encoding:'utf-8'});
// // readableMusic.pipe(process.stdout)

// // const transform = Transform.from('hellooooooo');





// // let bitrate = 50000;

// // ytdl.getBasicInfo('https://www.youtube.com/watch?v=rIKE6ktK-Yw')
// //     .then(res => {
// //         const newRes = {
// //             ...res,
// //             player_response: []
// //         }

// //         console.log(newRes.videoDetails.thumbnails[0]);
// //         console.log(newRes.videoDetails.title);
// //         console.log(newRes.videoDetails.lengthSeconds);
// //     });


import ffmpeg from 'fluent-ffmpeg'

const throttle = new Throttle({ rate: 100000 / 8 });

const info = ytdl.getInfo('https://www.youtube.com/watch?v=VV8rRZwkBtI').then(info => {

})

// const youtubeLive = fs.createReadStream('test.m4a').pipe(throttle)
const youtubeLive = ytdl('https://www.youtube.com/watch?v=VV8rRZwkBtI', { quality: 'highestaudio' }).pipe(throttle);

ffmpeg(youtubeLive);  

// ytdl.chooseFormat([])

// youtubeLive.once('readable', () => {
//     console.log(youtubeLive.read(4));
// })

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
        "Content-Type": "audio/x-m4a",
        "Transfer-Encoding": "chunked",
    }).status(200);

    console.log('User joined stream');

    youtubeLive.pipe(res)

    res.on('close', () => {
        console.log('User left the stream');
    })
})

app.get('/stop', (req, res) => {
    youtubeLive.pause();
    res.send();
})

app.get('/resume', (req, res) => {
    youtubeLive.resume();
    res.send();
})

app.listen(4000, () => {
    console.log('Listening...');
})



// import ytdl from "ytdl-core";

// ytdl.getInfo('https://www.youtube.com/watch?v=rIKE6ktK-Yw')
//     .then(res => {
//         const newRes = {
//             ...res,
//             player_response: []
//         }

//         console.log(newRes.videoDetails.thumbnails[0]);
//         console.log(newRes.videoDetails.title);
//         console.log(newRes.videoDetails.lengthSeconds);
//         console.log(newRes.formats[0]);
//     });