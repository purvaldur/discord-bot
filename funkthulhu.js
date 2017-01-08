var Discord = require("discord.js");
var token = require('./tokens.js');
var request = require('request')
var underscore = require('underscore');
var PlayMusic = require('playmusic');
var fs = require('fs');

var bot = new Discord.Client();
var pm = new PlayMusic();

var speaking = false;
var dispatcher = [];
var radio_dispatcher = [];
var gQueue = {};
var glist = JSON.parse(fs.readFileSync(__dirname + '/user_playlists.json', 'utf8'));

function play(message, search, type) {
    if (!gQueue[message.guild.id]) {
        gQueue[message.guild.id] = [];
        gQueue[message.guild.id].trackId = [];
        gQueue[message.guild.id].artist = [];
        gQueue[message.guild.id].track = [];
    }
    pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
        pm.search(search, 7, function(err, res) {
            if (res.entries == undefined && search != undefined) {
                message.channel.sendMessage("**Error:** http://i.imgur.com/fJNbVWN.png")
                return;
            }
            if (type == "song") {
                if (search != undefined) { //if song == undefined, skip all this
                    var result = res.entries.filter(function(data) { return data.type == 1 }).shift();
                    if (gQueue[message.guild.id].trackId.length > 0) {
                        message.channel.sendMessage(`**${result.track.artist} - ${result.track.title}** has been queued. The song is currently number ${gQueue[message.guild.id].trackId.length} in the queue`);
                        gQueue[message.guild.id].trackId.push(result.track.nid);
                        gQueue[message.guild.id].artist.push(result.track.artist);
                        gQueue[message.guild.id].track.push(result.track.title);
                        return
                    }
                    gQueue[message.guild.id].trackId.push(result.track.nid);
                    gQueue[message.guild.id].artist.push(result.track.artist);
                    gQueue[message.guild.id].track.push(result.track.title);
                }
                pm.getStreamUrl(gQueue[message.guild.id].trackId[0], function(err, streamUrl) {
                    dispatcher[message.guild.id] = bot.voiceConnections.get(message.guild.id).playStream(request(streamUrl), {seek:0, volume:0.15});
                    message.channel.sendMessage(`Currently playing: **${gQueue[message.guild.id].artist[0]} - ${gQueue[message.guild.id].track[0]}**`);
                    speaking = true;
                    dispatcher[message.guild.id].on('end', function() {
                        gQueue[message.guild.id].trackId.shift();
                        gQueue[message.guild.id].artist.shift();
                        gQueue[message.guild.id].track.shift();
                        if (gQueue[message.guild.id].trackId.length > 0) {
                            play(message, undefined, "song");
                        } else if (gQueue[message.guild.id].trackId.length == 0) {
                            message.channel.sendMessage("No more songs left in queue");
                            speaking = false;
                        }
                    });
                });
                return;
            } else if (type == "artist") {
                var result = res.entries.filter(function(data) { return data.type == 2 }).shift();
                pm.getArtist(result.artist.artistId, false, 5, 0, function(err, res) {
                    var helpmessage = `Adding **${res.name}'s** top 5 songs to the queue`;
                    for (var i = 0; i < res.topTracks.length; i++) {
                        helpmessage += `**${res.topTracks[i].artist} - ${res.topTracks[i].title}** has been added to the queue\n`;
                        gQueue[message.guild.id].trackId.push(res.topTracks[i].nid);
                        gQueue[message.guild.id].artist.push(res.topTracks[i].artist);
                        gQueue[message.guild.id].track.push(res.topTracks[i].title);
                    }
                    message.channel.sendMessage(helpmessage);
                    if (speaking == false) {
                        play(message, undefined, "song");
                    }
                });
                return;
            } else if (type == "album") {
                var result = res.entries.filter(function(data) { return data.type == 3 }).shift();
                pm.getAlbum(result.album.albumId, true, function(err, res) {
                    message.channel.sendMessage(`Adding all the songs from **${res.name}** by **${res.albumArtist}**\n`);
                    var helpmessage = ``;
                    for (var i = 0; i < res.tracks.length; i++) {
                        helpmessage += `**${res.tracks[i].artist} - ${res.tracks[i].title}** has been added to the queue\n`;
                        gQueue[message.guild.id].trackId.push(res.tracks[i].nid);
                        gQueue[message.guild.id].artist.push(res.tracks[i].artist);
                        gQueue[message.guild.id].track.push(res.tracks[i].title);
                    }
                    message.channel.sendMessage(helpmessage);
                    if (speaking == false) {
                        play(message, undefined, "song");
                    }
                });
                return;
            }
        });
    });
}
function shuffle(obj1, obj2, obj3) {
    var l = obj1.length,
        i = 0,
        rnd,
        tmp1,
        tmp2;

    while (i < l) {
        rnd = Math.floor(Math.random() * i);
        tmp1 = obj1[i];
        tmp2 = obj2[i];
        tmp3 = obj3[i];
        obj1[i] = obj1[rnd];
        obj2[i] = obj2[rnd];
        obj3[i] = obj3[rnd];
        obj1[rnd] = tmp1;
        obj2[rnd] = tmp2;
        obj3[rnd] = tmp3;
        i += 1;
    }
}
function info() {
    //fdsaf;
}

bot.on("ready", function() {
    console.log("Ready to begin! Serving in " + bot.guilds.size + " channels");
});

bot.on("message", function(message) {
    if (message.content.startsWith("!help")) {
        var helpmessage = "Need help? Here's a list of commands to get you started:\n\n";
        helpmessage += '```';
        helpmessage += '!help                     | Prints this list\n';
        helpmessage += "!join                     | Makes the bot join the voice channel you're currently in.\n";
        helpmessage += '!leave                    | Much like !join but makes the bot leave the channel instead\n';
        helpmessage += '!skip                     | Makes the bot skip the current !gmusic song being played\n';
        helpmessage += '\n';
        helpmessage += '!gl help                  | Prints instructions for "!gl" commands\n';
        helpmessage += '!gq help                  | Prints instructions for "!gq" commands\n';
        helpmessage += '!gm help                  | Prints instructions for "!gm" commands';
        helpmessage += '```';
        message.channel.sendMessage(helpmessage);
    }
    if (message.content.startsWith("!gm help")) {
        var helpmessage = "```";
        helpmessage += "!gm help                  | Prints this list.\n";
        helpmessage += '!gm song #SEARCHTERM      | Makes the bot look up the #SEARCHTERM and play the song in the voice channel\n';
        helpmessage += "!gm album #SEARCHTERM     | Makes the bot look up the #SEARCHTERM and play the album in the voice channel.\n";
        helpmessage += "!gm artist #SEARCHTERM    | Makes the bot look up the #SEARCHTERM and play the artist's top 5 in the voice channel.\n";
        helpmessage += "```";
        message.channel.sendMessage(helpmessage);
    }
    if (message.content.startsWith("!gl help")) {
        var helpmessage = "```";
        helpmessage += "!gl help                  | Prints this list.\n";
        helpmessage += "!gl create #NAME          | Creates a playlist with #NAME. Playlists are user-unique, and other people will not have access to your playlist.\n";
        helpmessage += "!gl add #LIST #SEARCHTERM | adds a song to your playlist. Replace #LIST with the name of your playlist.\n";
        helpmessage += "!gl list (#LIST)          | Displays a list of songs in a playlist. If no playlist is supplied, prints a list of your playlists.\n";
        helpmessage += "!gl delete #LIST #NUM     | Deletes a song from a playlist, based on the number. You can find the number of the songs by doing '!gl list #LIST'.\n";
        helpmessage += "!gl nuke #LIST            | Nukes a playlist, deleting it entirely.\n";
        helpmessage += "!gl play #LIST            | Similiar to '!gm song'. Puts the entire playlist onto the queue.\n";
        helpmessage += "```";
        message.channel.sendMessage(helpmessage);
    }
    if (message.content.startsWith("!gq help")) {
        var helpmessage = "```";
        helpmessage += "!gq help                  | Prints this list.\n";
        helpmessage += "!gq list                  | Prints a list of all the songs in the queue.\n";
        helpmessage += "!gq nuke                  | Nukes the queue and stops the currently playing music.\n";
        helpmessage += "!gq shuffle               | Shuffles the music in the queue.\n";
        helpmessage += "```";
        message.channel.sendMessage(helpmessage);
    }
    if (message.content.startsWith("!join")) {
        if (message.member.voiceChannel) {
            message.channel.sendMessage("Joining **" + message.member.voiceChannel.name + "**");
            message.member.voiceChannel.join();
            return;
        }
        message.channel.sendMessage("**Error:** You're not in a voice channel.");
    }
    if (message.content.startsWith("!leave")) {
        if (bot.voiceConnections.get(message.guild.id) && message.member.voiceChannel && bot.voiceConnections.get(message.guild.id).channel.id == message.member.voiceChannel.id) {
            message.channel.sendMessage("leaving **" + message.member.voiceChannel.name + "**");
            message.member.voiceChannel.leave();
            return;
        }
        message.channel.sendMessage("**Error:** You're not in the same voice channel as I am.");
    }
    if (message.content.startsWith("!gm song ")) {
        if (bot.voiceConnections.get(message.guild.id) && message.member.voiceChannel && bot.voiceConnections.get(message.guild.id).channel.id == message.member.voiceChannel.id) {
            play(message, message.content.replace("!gm song ", ""), "song");
            return
        }
        message.channel.sendMessage("**Error:** You're not in the same voice channel as I am.");
    }
    if (message.content.startsWith("!gm album ")) {
        if (bot.voiceConnections.get(message.guild.id) && message.member.voiceChannel && bot.voiceConnections.get(message.guild.id).channel.id == message.member.voiceChannel.id) {
            play(message, message.content.replace("!gm album ", ""), "album");
            return
        }
        message.channel.sendMessage("**Error:** You're not in the same voice channel as I am.");

    }
    if (message.content.startsWith("!gm artist ")) {
        if (bot.voiceConnections.get(message.guild.id) && message.member.voiceChannel && bot.voiceConnections.get(message.guild.id).channel.id == message.member.voiceChannel.id) {
            play(message, message.content.replace("!gm artist ", ""), "artist");
            return
        }
        message.channel.sendMessage("**Error:** You're not in the same voice channel as I am.");

    }
    if (message.content.startsWith("!skip")) {
        if (speaking == true) {
            message.channel.sendMessage("Skipping song.")
            dispatcher[message.guild.id].end();
            return
        }
        message.channel.sendMessage("**Error:** I'm not playing anything...")
    }

    if (message.content.startsWith("!gl create ")) {
        var msg = message.content.replace("!gl create ", "");
        if (msg.split(" ").length > 1) {
            message.channel.sendMessage("**Error:** Multi-word playlists are not supported. Stick to one word please (Seperating with dashes and underscores is fine).");
            return;
        }
        if (msg.startsWith(";")) {
            if (message.member.hasPermission('ADMINISTRATOR')) {
                msg = msg.replace(";", "");
                if (!glist.public[message.guild.id]) {
                    glist.public[message.guild.id] = {};
                }
                if (glist.public[message.guild.id][msg]) {
                    message.channel.sendMessage("**Error:** There's already a public playlist with this name!");
                    return;
                }
                glist.public[message.guild.id][msg] = {};
                glist.public[message.guild.id][msg].trackId = [];
                glist.public[message.guild.id][msg].artist = [];
                glist.public[message.guild.id][msg].track = [];
                fs.writeFileSync(__dirname + '/user_playlists.json', JSON.stringify(glist));
                message.channel.sendMessage("**Succes:** Public playlist was succesfully created");
                return;
            }
            message.channel.sendMessage("**Error:** You do not have permission to create a public playlist on this server. Please ask a server admin to create one for you.");
            return;
        }
        if (!glist.private[message.author.id]) {
            glist.private[message.author.id] = {};
        }
        if (glist.private[message.author.id][msg]) {
            message.channel.sendMessage(`**Error:** There's already a private playlist named **${msg}** in your name!`);
            return;
        }
        glist.private[message.author.id][msg] = {};
        glist.private[message.author.id][msg].trackId = [];
        glist.private[message.author.id][msg].artist = [];
        glist.private[message.author.id][msg].track = [];
        fs.writeFileSync(__dirname + '/user_playlists.json', JSON.stringify(glist));
        message.channel.sendMessage("**Succes:** Private playlist was succesfully created");
    }
    if (message.content.startsWith("!gl add ")) {
        var msg = message.content.replace("!gl add ", "");
        if (msg.startsWith(";")) {
            msg = msg.replace(";", "");
            var listname = underscore.first(msg.split(" "));
            if (!glist.public[message.guild.id] || !glist.public[message.guild.id][listname]) {
                message.channel.sendMessage(`**Error:** There's no public playlist with that name. Please contact a server admin to create one`);
                return;
            }
            msg = msg.replace(listname, "");
            pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
                pm.search(msg, 5, function(err, res) {
                    if (res.entries == undefined) {
                        message.channel.sendMessage("**Error:** http://i.imgur.com/fJNbVWN.png")
                        return;
                    }
                    var result = res.entries.filter(function(data) { return data.type == 1 }).shift();
                    glist.public[message.guild.id][listname].trackId.push(result.track.nid);
                    glist.public[message.guild.id][listname].artist.push(result.track.artist);
                    glist.public[message.guild.id][listname].track.push(result.track.title);
                    fs.writeFileSync(__dirname + '/user_playlists.json', JSON.stringify(glist));
                    message.channel.sendMessage(`Succesfully added **${result.track.artist} - ${result.track.title}**`);
                });
            });
            return;
        }
        var listname = underscore.first(msg.split(" "));
        if (!glist.private[message.author.id] || !glist.private[message.author.id][listname]) {
            message.channel.sendMessage(`**Error:** There's no private playlist with that name. Write \`\`!gl create #NAME\`\` to create one`);
            return;
        }
        msg = msg.replace(listname, "");
        pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
            pm.search(msg, 5, function(err, res) {
                if (res.entries == undefined) {
                    message.channel.sendMessage("**Error:** http://i.imgur.com/fJNbVWN.png")
                    return;
                }
                var result = res.entries.filter(function(data) { return data.type == 1 }).shift();
                glist.private[message.author.id][listname].trackId.push(result.track.nid);
                glist.private[message.author.id][listname].artist.push(result.track.artist);
                glist.private[message.author.id][listname].track.push(result.track.title);
                fs.writeFileSync(__dirname + '/user_playlists.json', JSON.stringify(glist));
                message.channel.sendMessage(`Succesfully added **${result.track.artist} - ${result.track.title}**`);
            });
        });
    }
    if (message.content.startsWith("!gl list")) { //TODO: Rewrite shiiiet ("gl delete" for example)
        if (message.content.length == 8) {
            if (Object.keys(glist.private[message.author.id]).length == 0) {
                message.channel.sendMessage('**Error:** You do not have any playlists in your name. Write ``!gl create #NAME`` to make your first playlist');
                return;
            }
            var listmessage = "Here's a list of all your playlists:\n ```";
            for (var i = 0; i < Object.keys(glist.private[message.author.id]).length; i++) {
                listmessage += `[${i}]: ${Object.keys(glist.private[message.author.id])[i]}\n`;
                if (listmessage.length > 1900) {
                    listmessage += "```";
                    message.channel.sendMessage(listmessage);
                    listmessage = "```";
                }
            }
            listmessage += "```";
            message.channel.sendMessage(listmessage);
            return;
        }
        var msg = message.content.replace("!gl list ", "");
        if (msg.startsWith(";")) {
            if (msg.length == 1) {
                if (!glist.public[message.guild.id] || Object.keys(glist.public[message.guild.id]).length == 0) {
                    message.channel.sendMessage("**Error:** There's no public playlists on this server. Contact an admin to create one!");
                    return;
                }
                var listmessage = "Here's a list of all the server's playlists:\n ```";
                for (var i = 0; i < Object.keys(glist.public[message.guild.id]).length; i++) {
                    listmessage += `[${i}]: ${Object.keys(glist.public[message.guild.id])[i]}\n`;
                    if (listmessage.length > 1900) {
                        listmessage += "```";
                        message.channel.sendMessage(listmessage)
                        listmessage = "```";
                    }
                }
                listmessage += "```";
                message.channel.sendMessage(listmessage)
                return;
            }
            msg = msg.replace(";", "");
            if (!glist.public[message.guild.id][msg]) {
                message.channel.sendMessage("**Error:** There's no public playlist with that name. Please contact a server admin to create one");
                return;
            }
            if (glist.public[message.guild.id][msg].trackId.length == 0) {
                message.channel.sendMessage("**Error:** Playlist is empty! Write ``!gl add ;#SEARCHTERM`` to add some funk to the list");
                return;
            }
            var listmessage = "Here's a list of all the songs in **;" + msg + ":**\n ```";
            for (var i = 0; i < glist.public[message.guild.id][msg].trackId.length; i++) {
                listmessage += `[${i}]: ${glist.public[message.guild.id][msg].artist[i]} - ${glist.public[message.guild.id][msg].track[i]}\n`;
                if (listmessage.length > 1900) {
                    listmessage += "```";
                    message.channel.sendMessage(listmessage);
                    listmessage = "```";
                }
            }
            listmessage += "```";
            message.channel.sendMessage(listmessage);
            return;
        }
        if (!glist.private[message.author.id][msg]) {
            message.channel.sendMessage("**Error:** You do not have a private playlist with that name. Write ``!gl create #NAME`` to create a playlist");
            return;
        }
        if (glist.private[message.author.id][msg].trackId.length == 0) {
            message.channel.sendMessage("**Error:** Playlist is empty! Wrute ``!gl add #SEARCHTERM`` to add some funk to the list");
            return;
        }
        var listmessage = "Here's a list of all the songs in **" + msg + ":**\n ```";
        for (var i = 0; i < glist.private[message.author.id][msg].trackId.length; i++) {
            listmessage += `[${i}]: ${glist.private[message.author.id][msg].artist[i]} - ${glist.private[message.author.id][msg].track[i]}\n`;
            if (listmessage.length > 1900) {
                listmessage += "```";
                message.channel.sendMessage(listmessage);
                listmessage = "```";
            }
        }
        listmessage += "```";
        message.channel.sendMessage(listmessage);
    }
    if (message.content.startsWith("!gl delete ")) {
        var msg = message.content.split(" ");
        if (msg.length < 4) {
            message.channel.sendMessage("**Error:** too few arguments");
            return;
        }
        var listname = msg[2];
        var index = msg[3];
        if (listname.startsWith(";")) {
            if (!glist.public[message.guild.id]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not a public playlist on this server!");
                return;
            }
            listname = listname.replace(";", "")
            var access = glist.public[message.guild.id];
            if (!access[listname]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not a public playlist on this server!");
                return;
            }
        } else {
            var access = glist.private[message.author.id];
            if (!access[listname]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not one of your private playlists!");
                return;
            }
        }
        if (access[listname].trackId[index]) {
            message.channel.sendMessage(`**${access[listname].artist[index]} - ${access[listname].track[index]}** has been deleted from **${listname}**`);

            access[listname].trackId.splice(index, 1)
            access[listname].artist.splice(index, 1)
            access[listname].track.splice(index, 1)
            fs.writeFileSync(__dirname + '/user_playlists.json', JSON.stringify(glist));
            return;
        }
        message.channel.sendMessage("**Error:** Unable to find song number **" + index + "** in **" + listname + "**");
    }
    if (message.content.startsWith("!gl nuke ")) {
        var msg = message.content.split(" ");
        var listname = msg[2];
        if (listname.startsWith(";")) {
            if (!message.member.hasPermission('ADMINISTRATOR')) {
                message.channel.sendMessage("**Error:** You do not have permission to create a public playlist on this server. Please ask a server admin to create one for you.");
                return;
            }
            if (!glist.public[message.guild.id]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not a public playlist on this server!");
                return;
            }
            listname = listname.replace(";", "")
            var access = glist.public[message.guild.id];
            if (!access[listname]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not a public playlist on this server!");
                return;
            }
        } else {
            var access = glist.private[message.author.id];
            if (!access[listname]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not one of your private playlists!");
                return;
            }
        }
        delete access[listname];
        fs.writeFileSync(__dirname + '/user_playlists.json', JSON.stringify(glist));
        message.channel.sendMessage("Playlist has been nuked.")
    }
    if (message.content.startsWith("!gl play ")) {
        var msg = message.content.split(" ");
        var listname = msg[2];
        if (listname.startsWith(";")) {
            if (!glist.public[message.guild.id]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not a public playlist on this server!");
                return;
            }
            listname = listname.replace(";", "")
            var access = glist.public[message.guild.id];
            if (!access[listname]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not a public playlist on this server!");
                return;
            }
        } else {
            var access = glist.private[message.author.id];
            if (!access[listname]) {
                message.channel.sendMessage("**Error:** **" + listname + "** is not one of your private playlists!");
                return;
            }
        }
        if (!gQueue[message.guild.id]) {
            gQueue[message.guild.id] = [];
            gQueue[message.guild.id].trackId = [];
            gQueue[message.guild.id].artist = [];
            gQueue[message.guild.id].track = [];
        }
        for (var i = 0; i < access[listname].trackId.length; i++) {
            gQueue[message.guild.id].trackId.push(access[listname].trackId[i]);
            gQueue[message.guild.id].artist.push(access[listname].artist[i]);
            gQueue[message.guild.id].track.push(access[listname].track[i]);
        }
        message.channel.sendMessage("All the songs in **" + listname + "** has been added to the queue")
        if (speaking == false) {
            play(message, undefined, "song");
        }
    }

    if (message.content.startsWith("!gq list")) {
        if (!gQueue[message.guild.id].trackId || gQueue[message.guild.id].trackId.length == 0) {
            message.channel.sendMessage('The queue is currently empty. Do ``!gm song #NAME`` or ``!gl play #NAME`` to start playing some funky tunes');
            return;
        }
        var listmessage = "Here's a list of all the songs left in the queue:\n ```";
        for (var i = 0; i < gQueue[message.guild.id].trackId.length; i++) {
            listmessage += `[${[i]}]: ${gQueue[message.guild.id].artist[i]} - ${gQueue[message.guild.id].track[i]}\n`;
            if (listmessage.length > 1900) {
                listmessage += "```";
                message.channel.sendMessage(listmessage)
                listmessage = "```";
            }
        }
        listmessage += "```";
        message.channel.sendMessage(listmessage);
    }
    if (message.content.startsWith("!gq nuke")) {
        if (gQueue[message.guild.id]) {
            message.channel.sendMessage('No more funky tunes? *sigh* fineee... *nukes the queue*');
            gQueue[message.guild.id].trackId = [];
            gQueue[message.guild.id].artist = [];
            gQueue[message.guild.id].track = [];
            dispatcher[message.guild.id].end();
            return;
        }
        message.channel.sendMessage('the queue is currently empty. Do ``!gm song #NAME`` or ``!gl play #NAME`` to start playing some funky tunes');
    }
    if (message.content.startsWith("!gq shuffle")) {
        if (!gQueue[message.guild.id].trackId || gQueue[message.guild.id].trackId.length == 0) {
            message.channel.sendMessage('The queue is currently empty. Do ``!gm song #NAME`` or ``!gl play #NAME`` to start playing some funky tunes');
            return;
        }
        var tempId = gQueue[message.guild.id].trackId.shift();
        var tempArt = gQueue[message.guild.id].artist.shift();
        var tempTra = gQueue[message.guild.id].track.shift();
        shuffle(gQueue[message.guild.id].trackId, gQueue[message.guild.id].artist, gQueue[message.guild.id].track);
        gQueue[message.guild.id].trackId.unshift(tempId);
        gQueue[message.guild.id].artist.unshift(tempArt);
        gQueue[message.guild.id].track.unshift(tempTra);
        message.channel.sendMessage('The queue has been shuffled. Write ``!gq list`` to see the new queue');
    }
});

bot.login(bot_token);
process.on("uncaughtException", (error) => { if(error.code === "ECONNRESET") return; });

//For avoidong Heroku $PORT error
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.get('/', function(request, response) {
    var result = 'App is running'
    response.send(result);
}).listen(app.get('port'), function() {
    console.log('App is running, server is listening on port ', app.get('port'));
});
