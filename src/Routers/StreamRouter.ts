import { Router } from "express";
import { QueueFactory } from "../Queue/QueueFactory";

const streamRouter = Router();

streamRouter.get('/stream/:id', (req, res) => {
    const roomId = req.params.id;
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
    
    
    const {id, client } = queue.addClient();

    client.pipe(res);

    res.on('close', () => {
        queue.removeClient(id);
    })
})

streamRouter.get('/starts/:id', (req, res) => {
    const roomId = req.params.id;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.play();

    res.sendStatus(200)
})

streamRouter.get('/pause/:id', (req, res) => {
    const roomId = req.params.id;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.pause();

    res.sendStatus(200)
})

streamRouter.get('/resume/:id', (req, res) => {
    const roomId = req.params.id;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.resume();

    res.sendStatus(200)
})

streamRouter.get('/add/:id', (req, res) => {
    const roomId = req.params.id;
    const {trackUrl} = req.body;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.addTrack(trackUrl);

    res.sendStatus(200)
})

streamRouter.get('/skip/:id', (req, res) => {
    const roomId = req.params.id;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.skip();

    res.sendStatus(200)
})

streamRouter.post('/edit/:id', (req, res) => {
    const roomId = req.params.id;
    const tracks: string[] = req.body.tracks;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.modifiyTracks(tracks);

    res.sendStatus(200);
})


export default streamRouter;