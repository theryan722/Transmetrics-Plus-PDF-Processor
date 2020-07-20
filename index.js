const express = require('express');
const app = express();
const fs = require('fs');
const port = 80;
const pdftk = require('node-pdftk');

const cors = require('cors')({
    origin: true
});



app.get('/pdf', function (req, res) {
    pdftk
        .input(__dirname + '/orig/test.pdf')
        .fillForm({
            "1-AV#*": 'my av id!!'
        })
        .flatten()
        .output()
        .then(buffer => {
            console.log('buf: ', buffer);
            fs.writeFile(__dirname + '/out/written.pdf', buffer, function (err) {
                if (err) return console.log(err);
                res.sendFile(__dirname + '/out/written.pdf');
            });
        })
        .catch(err => {
            console.log('err: ', err);
        });

    

});

app.listen(port, () => console.log(`Example app listening at ${port}`));