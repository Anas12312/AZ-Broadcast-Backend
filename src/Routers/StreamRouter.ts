import { Router } from "express";
import { QueueFactory, Track } from "../Queue/QueueFactory";

const streamRouter = Router();

streamRouter.get('/stream/:id/:socketId', async (req, res) => {
    const {id: roomId, socketId } = req.params;
    const queue = QueueFactory.getQueue(roomId);
    
    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }
    
    res.set({
        "Content-Type": 'audio/webm',
        "Transfer-Encoding": "chunked",
        "Connection": 'keep-alive',
        "Keep-Alive": 'timeout=999999'
    }).status(200);
    
    
    const result = await queue.addClient(socketId);

    if(!result) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    result.broadcastClient.httpClient.pipe(res);

    // res.on('close', () => {
    //     queue.removeClient(result.id);
    // })
})

// streamRouter.get('/starts/:id', (req, res) => {
//     const roomId = req.params.id;

//     const queue = QueueFactory.getQueue(roomId);

//     if(!queue) {
//         return res.status(400).send({error: 'Invalid room Id'});
//     }

//     queue.play();

//     res.sendStatus(200)
// })

streamRouter.get('/pause/:id/:socketId', (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.pauseAPI(socketId);

    res.sendStatus(200)
})

streamRouter.get('/resume/:id/:socketId', (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.resume(socketId);

    res.sendStatus(200)
})

streamRouter.post('/add/:id/:socketId', async (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId;
    const {trackUrl} = req.body;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    await queue.addTrack(trackUrl, socketId);

    res.sendStatus(200)
})

streamRouter.get('/skip/:id/:socketId', (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.skip(socketId);

    res.sendStatus(200)
})

streamRouter.get('/prev/:id/:socketId', (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.prev(socketId);

    res.sendStatus(200)
})

streamRouter.post('/edit/:id/:socketId', (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId
    const tracks: Track[] = req.body.tracks;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.modifiyTracks(tracks, socketId);

    res.sendStatus(200);
})

streamRouter.get('/queue/:id/:socketId', (req, res) => {
    const roomId = req.params.id;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    res.send(queue.getTracks());
})

streamRouter.get('/remove/:id/:socketId/:trackId', (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId;
    const trackId = req.params.trackId;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.removeTrack(trackId, socketId);

    res.sendStatus(200);
})

streamRouter.get('/play/:id/:socketId/:trackId', async (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId;
    const trackId = req.params.trackId;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    await queue.playAPI(socketId, trackId);

    res.sendStatus(200);
})

streamRouter.get('/loop/:id/:socketId/:option', (req, res) => {
    const roomId = req.params.id;
    const socketId = req.params.socketId;
    const option = +req.params.option;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    if(option === 0) {
        queue.loopAPI(socketId, false);
    }

    if(option === 1) {
        queue.loopAPI(socketId, true);
    }

    if(option === 2) {
        queue.loopOneAPI(socketId);
    }

    res.sendStatus(200);
})

streamRouter.get('/status/:id', async (req, res) => {
    const roomId = req.params.id;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    // res.send(queue.getStatusAPI());
})


export default streamRouter;