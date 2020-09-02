const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const app = express();
const port = 443;
const pdftk = require('node-pdftk');
const multer = require('multer');
const fs = require('fs');
const authID = 'YR26t5GAKDzErOgI33xIUgLsHdXdVX4S';

const mergePDFDownloadLocation = __dirname + '/downloadedmerge';

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
    let allowedOrigins = ['http://localhost:8080', 'https://transmetrics-plus-staging.web.app', 'https://test.transmetricsplus.com', 'https://transmetricsplus.com', 'https://www.transmetricsplus.com'];
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
        console.log('[ /pdf: Received processed PDF. ]');
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
                res.status(500).send('PDFTK Error: ' + pdfError);
            });
    }
});

app.post('/pdfmerge', type, function (req, res) {

    //This is not a serious api key/auth system, just intended as a simple/fast line of defense
    if (!req.body.authid || req.body.authid !== authID) {
        console.log('Unauthorized request.');
        res.status(401).send('Unauthorized request.');
    } else {
        console.log('[ /pdfmerge: Received PDF URLS. ]');
        let filesToDownload = JSON.parse(req.body.filestomerge);
        let promiseList = [];
        for (let i in filesToDownload) {
            promiseList.push(downloadPDFAndGetMergeInfo(filesToDownload[i]));
        }
        let pdftkInput = {};
        let pdftkCat = '';
        Promise.all(promiseList).then(function (downloadedPDFS) {
            downloadedPDFS.forEach(function (downloadedPDF) {
                pdftkInput[downloadedPDF.id] = downloadedPDF.fileLoc;
                pdftkCat += downloadedPDF.id + ' ';
            });
            pdftkCat.trim();
            console.log('input: ', pdftkInput);
            console.log('cat: ', pdftkCat);
            //The input file key names that are also supplied to cat() must only be capital letters A-Z. No mixing of numbers/lower case letters.
            pdftk
                .input(pdftkInput)
                .cat(pdftkCat)
                .output().then(buffer => {
                    deleteDownloadedPDFSToMerge(downloadedPDFS).then(function () {
                        console.log('[ Sending merged PDF. ]');
                        res.status(200).send(buffer);
                    }).catch(function (error) {
                        console.log('Error deleting downloaded PDFs to merge: ', error);
                        res.status(500).send('Delete Error');
                    });
                }).catch(pdfError => {
                    console.log('PDFTK Error: ', pdfError);
                    res.status(500).send('PDFTK Error: ' + pdfError);
                });
        });
    }
});


fs.readFile('/opt/bitnami/apache2/conf/pdfprocessor.transmetricsplus.com.key', function read(err, key) {
    if (err) {
        throw err;
    }
    fs.readFile('/opt/bitnami/apache2/conf/pdfprocessor.transmetricsplus.com.crt', function read(err, cert) {
        if (err) {
            throw err;
        }
        const httpsServer = https.createServer({
            key,
            cert
        }, app).listen(443);
    });
});

function deleteDownloadedPDFSToMerge(downloadedPDFS) {
    return new Promise(function (resolve, reject) {
        let promiseList = [];
        downloadedPDFS.forEach(function (downloadedPDF) {
            promiseList.push(deleteFile(downloadedPDF.fileLoc));
        });
        Promise.all(promiseList).then(function () {
            resolve();
        }).catch(function (error) {
            reject(error);
        });
    });

}

function deleteFile(fileLoc) {
    return new Promise(function (resolve, reject) {
        fs.unlink(fileLoc, (deleteError) => {
            if (deleteError) {
                reject(deleteError);
            } else {
                resolve();
            }
        });
    });
}

function downloadPDFAndGetMergeInfo(url) {
    return new Promise(function (resolve, reject) {
        let fileID = generateID();
        let fileLoc = mergePDFDownloadLocation + '/' + fileID + '.pdf';
        const newFile = fs.createWriteStream(fileLoc);
        const request = https.get(url, function (response) {
            response.pipe(newFile);
        });
        newFile.on('finish', function () {
            newFile.close();
            resolve({
                id: fileID,
                fileLoc: fileLoc,
                url: url
            });
        });
    });
}

function generateID() {
    let length = 40;
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

//app.listen(port, () => console.log(`Transmetrics Plus PDF Process Running. Listening on port: ${port}`));