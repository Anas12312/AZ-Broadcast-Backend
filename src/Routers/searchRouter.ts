import { Request, Response, Router } from "express";
import yts from "yt-search";
const searchRouter = Router();

searchRouter.get('/yt', async (req, res) => {
    const { searchTerm } = req.body
    const results = await yts(searchTerm)
    const videos = results.videos.map((video) => {
        return {
            name: video.title,
            url: video.url,
            thumbnail: video.thumbnail,
            author: video.author.name,
            duration: video.seconds
        }
    })
    res.send(videos)
})

export default searchRouter;