const express = require('express');
const app = express();
const fs = require('fs');
const port = 3000;

const cors = require('cors')({
    origin: true
});

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening at ${port}`));