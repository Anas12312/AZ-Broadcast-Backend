"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const imageRouter = (0, express_1.Router)();
imageRouter.post('/upload/', (0, express_fileupload_1.default)(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const img = req.files.file;
        cloudinary_1.default.v2.config({
            cloud_name: 'dknhrwczx',
            api_key: '177672793956226',
            api_secret: 'R3kZjwFoEhTfxF19D4uWTdAEnZM',
            secure: true,
        });
        const result = yield new Promise((resolve) => {
            cloudinary_1.default.v2.uploader.upload_stream((error, uploadResult) => {
                return resolve(uploadResult);
            }).end(img.data);
        });
        // console.log(result.url);
        res.send({ image: result.url });
    }
    catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
}));
exports.default = imageRouter;
