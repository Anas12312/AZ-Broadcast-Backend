import { Request, Response, Router } from "express";
import yts from "yt-search";
const searchRouter = Router();

searchRouter.post('/yt', async (req, res) => {
    const { searchTerm } = req.body
    const results = await yts({
        query: searchTerm,
        pages: 0,
        pageStart: 0,
        pageEnd: 0
    })
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