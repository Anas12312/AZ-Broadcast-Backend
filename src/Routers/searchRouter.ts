import { Request, Response, Router } from "express";
import yts from "yt-search";
import search from "youtube-search";
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
searchRouter.post('/yt2', async (req, res) => {
    const { searchTerm } = req.body
    search(searchTerm, {
        maxResults: 20,
        key: 'AIzaSyChSu46WcWiwumc1QKz3iShpjXNmWxOywE',
        videoDuration: "any",
        type: "video"
    },  (err, results) => {
        if(err) return res.status(400).send({message: err.message})
        const videos = results?.map((video) => {
            return {
                name: video.title,
                url: video.link,
                thumbnail: video.thumbnails.high? video.thumbnails.high.url: video.thumbnails.default,
                author: video.channelTitle,
                // duration: video.seconds
            }
        })
        res.send(videos)
    })
})

export default searchRouter;