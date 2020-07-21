const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const app = express();
const port = 443;
const pdftk = require('node-pdftk');
const multer = require('multer');
const fs = require('fs');
const authID = 'YR26t5GAKDzErOgI33xIUgLsHdXdVX4S';

app.use(bodyParser.json({
    extended: true,
    limit: 1024 * 1024 * 10
}));

let upload = multer({
    dest: __dirname + '/uploads'
});
let type = upload.single('pdf');

app.use(bodyParser.urlencoded({
    extended: true
}));

const cors = require('cors')({
    origin: true
});

app.use(function (req, res, next) {
    let allowedOrigins = ['http://localhost:8080', 'https://transmetrics-plus-staging.web.app'];
    let origin = req.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/pdf', type, function (req, res) {
    //This is not a serious api key/auth system, just intended as a simple/fast line of defense
    if (!req.body.authid || req.body.authid !== authID) {
        console.log('Unauthorized request.');
        res.status(401).send('Unauthorized request.');
    } else {
        console.log('[ Received processed PDF. ]');
        let fields = JSON.parse(req.body.fields);
        pdftk
            .input(req.file.path)
            .fillForm(fields)
            .flatten()
            .output().then(buffer => {
                fs.unlink(req.file.path, (deleteError) => {
                    if (deleteError) {
                        console.log('Delete error: ', deleteError);
                        res.status(500).send('Delete Error');
                    } else {
                        console.log('[ Sending processed PDF. ]');
                        res.status(200).send(buffer);
                    }
                });
            }).catch(pdfError => {
                console.log('PDFTK Error: ', pdfError);
                res.status(500).send('PDFTK Error');
            });
    }
});


fs.readFile('/opt/bitnami/apache2/conf/transmetricspdfprocessor.engagewhiz.com.key', function read(err, key) {
    if (err) {
        throw err;
    }
    fs.readFile('/opt/bitnami/apache2/conf/transmetricspdfprocessor.engagewhiz.com.crt', function read(err, cert) {
        if (err) {
            throw err;
        }
        const httpsServer = https.createServer({
            key,
            cert
        }, app).listen(443);
    });
});



//app.listen(port, () => console.log(`Transmetrics Plus PDF Process Running. Listening on port: ${port}`));