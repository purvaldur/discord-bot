var token = require('./tokens.js');
var PlayMusic = require('playmusic');
var pm = new PlayMusic();

//pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
//    pm.search("daft punk", 5, function(err, res) {
//        var result = res.entries.filter(function(data) { return data.type == 2 }).shift();
//        pm.getArtist(result.artist.artistId, false, 5, 0, function(err, res) {
//            console.log(res);
//        });
//        //console.log(JSON.stringify(artist));
//    });
//});
var str = "!gl list"
console.log(str.length);
