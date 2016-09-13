var lame = require('lame');
var icecast = require('icecast');

// URL to a known Icecast stream
var url = 'http://live-icy.gss.dr.dk:8000/A/A13H.mp3';

// connect to the remote stream
icecast.get(url, function (res) {
    // log any "metadata" events that happen
    res.on('metadata', function (metadata) {
        var parsed = icecast.parse(metadata);
        console.log(parsed.StreamTitle.toString().replace("Senest spillet: ", ""));
    });
});
