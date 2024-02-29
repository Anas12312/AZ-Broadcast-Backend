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

streamRouter.get('/start/:id', (req, res) => {
    const roomId = req.params.id;

    const queue = QueueFactory.getQueue(roomId);

    if(!queue) {
        return res.status(400).send({error: 'Invalid room Id'});
    }

    queue.start();

    res.send(200)
})

export default streamRouter;