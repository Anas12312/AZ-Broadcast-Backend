import { Request, Response, Router } from "express";
import * as ftp from 'basic-ftp'
import { randomUUID } from "crypto";
import { Readable } from "stream";
import fileUpload from 'express-fileupload'
import cloudinary from 'cloudinary'
import { resolve } from "path";

const imageRouter = Router();

imageRouter.post('/upload/', fileUpload(), async (req, res) => {
    try {
        const img = req.files!.file as any
        cloudinary.v2.config({
            cloud_name: 'dknhrwczx',
            api_key: '177672793956226',
            api_secret: 'R3kZjwFoEhTfxF19D4uWTdAEnZM',
            secure: true,
        });

        const result = await new Promise((resolve) => {
            cloudinary.v2.uploader.upload_stream((error, uploadResult) => {
                return resolve(uploadResult);
            }).end(img.data);
        }) as any;


        // console.log(result.url);
        res.send({image:result.url});
    } catch (e) {
        console.log(e);
        res.status(500).send(e)

    }
})


export default imageRouter;