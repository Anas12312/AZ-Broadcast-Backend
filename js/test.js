const express = require('express')
const app = express()

app.get('/', (req, res) => {
    res.send("Z Manga")
})

app.listen(3000, () => {
    console.log("hello")
})
