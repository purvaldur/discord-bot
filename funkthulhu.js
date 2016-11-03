var Discord = require("discord.js");
var token = require('./tokens.js');
var streams = require('./streams.js');
var request = require('request')
var underscore = require('underscore');
var icecast = require('icecast');
var PlayMusic = require('playmusic');
var fs = require('fs');

var mybot = new Discord.Client();
var pm = new PlayMusic();
var voice_channel;
var stationlist_string;
var dispatcher = [];
var icecast_parsed;
var icecast_string;
var radio;
var radio_playing = false;

var gQueue = {};

function radiolist() {
    stationlist_string = "";
    underscore.each(streams.streamlist, function(value, key) {
        stationlist_string += key.toString() + "\n";
    })
}
function play(song, serverId, channel, playlist, authorId) {
    if (!gQueue[serverId] || !gQueue[serverId].trackId) {
        gQueue[serverId] = [];
        gQueue[serverId].trackId = [];
        gQueue[serverId].artist = [];
        gQueue[serverId].track = [];
    }
    pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
        if (playlist == undefined) {
            pm.search(song, 5, function(err, res) {
                var gSong = res.entries.filter(function(data) { return data.type == 1 }).shift();
                var songname = gSong.track.title;
                if (gQueue[serverId].trackId.length != 0 && song != undefined) {
                    gQueue[serverId].trackId.push(gSong.track.nid);
                    gQueue[serverId].artist.push(gSong.track.artist);
                    gQueue[serverId].track.push(gSong.track.title);
                    var queuelength = gQueue[serverId].trackId.length - 1;
                    channel.sendMessage("Song has been queued. It is currently number " + queuelength + " in the queue");
                }
                else {
                    if (song != undefined)  {
                        gQueue[serverId].trackId.push(gSong.track.nid);
                        gQueue[serverId].artist.push(gSong.track.artist);
                        gQueue[serverId].track.push(gSong.track.title);
                    }
                    pm.getStreamUrl(gQueue[serverId].trackId[0], function(err, streamUrl) {
                        dispatcher[serverId] = mybot.voiceConnections.get(serverId).playStream(request(streamUrl), {seek:0, volume:0.33});
                        channel.sendMessage(`Currently playing: **${gQueue[serverId].artist[0]} - ${gQueue[serverId].track[0]}**`);
                        dispatcher[serverId].on('end', function() {
                            if (gQueue[serverId].trackId) {
                                gQueue[serverId].trackId.shift();
                                gQueue[serverId].artist.shift();
                                gQueue[serverId].track.shift();
                                if (gQueue[serverId].trackId.length != 0) {
                                    play(undefined, serverId, channel, undefined, undefined);
                                }
                            } else {
                                channel.sendMessage("No more songs left in queue");
                            }
                        });
                    });
                }
            });
        }
        if (playlist != undefined) {
            var glist = JSON.parse(fs.readFileSync(__dirname + '/user_playlists.json', 'utf8'));
            for (var i = 0; i < glist[authorId][playlist].trackId.length; i++) {
                gQueue[serverId].trackId.push(glist[authorId][playlist].trackId[i]);
                gQueue[serverId].artist.push(glist[authorId][playlist].artist[i]);
                gQueue[serverId].track.push(glist[authorId][playlist].track[i]);
            }
            channel.sendMessage("All the songs in the playlist has been queued!");
            if (!dispatcher[serverId]) {
                play(undefined, serverId, channel, undefined, undefined);
            }
        }
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
mybot.on("ready", function() {
    console.log("Ready to begin! Serving in " + mybot.guilds.size + " channels");
});

mybot.on("message", function(message) {
    if (message.content.startsWith("!help")) {
        var helpmessage = "Want help? Here's a list of commands to get you started:\n\n";
        helpmessage += '```';
        helpmessage += '!help                       | Prints this list\n';
        helpmessage += "!join                       | Makes the bot join the voice channel you're currently in.\n";
        helpmessage += '!leave                      | Much like !join but makes the bot leave the channel instead\n';
        helpmessage += '!radio list                 | Makes the bot return a list of radio channels available to play.\n';
        helpmessage += '!radio #STATION             | Makes the bot start streaming a station.\n';
        helpmessage += '!radio info                 | Makes the bot respond with metadata of the song/radio if provided.\n';
        helpmessage += '!gmusic song #SEACHTERM     | Makes the bot look up the #SEARCHTERM and play it in the voice channel\n';
        helpmessage += '!skip                       | Makes the bot skip the current !gmusic song being played\n\n';
        helpmessage += '!glist help                 | Prints instructions for "!glist" commands\n';
        helpmessage += '!queue help                 | Prints instructions for "!queue" commands';
        helpmessage += '```';
        message.channel.sendMessage(helpmessage);
    }
    if(message.content.startsWith("!ping")) {
        message.channel.sendMessage("pong");
        console.log("pong-ed " + message.author.username);
    }
    if (message.content.startsWith("!join")) {
        voice_channel = message.member.voiceChannel;
        if (voice_channel == undefined) {
            message.channel.sendMessage("Error! (are you not in a voice channel?)")
        } else {
            message.channel.sendMessage('Joining channel named "' + voice_channel.name + '"')
            voice_channel.join()
        }
    }
    if (message.content.startsWith("!leave")) {
        voice_channel = message.member.voiceChannel;
        if (voice_channel == undefined) {
            message.channel.sendMessage("Error! (are you not in a voice channel?)")
        } else {
            message.channel.sendMessage('Leaving channel named "' + voice_channel.name + '"')
            voice_channel.leave()
            mybot.user.setStatus("Online", "");
            radio_playing = false;
            if (gQueue[message.guild.id]) {
                delete gQueue[message.guild.id];
            }
        }
    }
    if (message.content.startsWith("!radio ") && message.content !== "!radio info" && message.content !== "!radio list") {
        voice_channel = message.member.voiceChannel;
        var radio_string = message.content.replace("!radio ", "");
        radio = streams.streamlist[radio_string];
        if (radio !== undefined) {
            if (!voice_channel || voice_channel.type !== 'voice') {
                message.channel.sendMessage("Error! (are you not in a voice channel?)");
            } else {
                if (mybot.voiceConnections.get(message.guild.id) && mybot.voiceConnections.get(message.guild.id).channel.id == voice_channel.id) {
                    radio_playing = true;
                    dispatcher = mybot.voiceConnections.get(message.guild.id).playStream(request(radio), {seek:0, volume:0.1});
                    icecast.get(radio, function (response) {
                        response.on('metadata', function (metadata) {
                            icecast_parsed = icecast.parse(metadata);
                            icecast_string = icecast_parsed.StreamTitle.toString().replace("Senest spillet: ", "");
                            if (icecast_string) {
                                message.channel.sendMessage("**Currently playing:** " + icecast_string);
                            } else {
                                message.channel.sendMessage("**Currently playing:** *unable to retrieve info*");
                            }
                        });
                    });
                    mybot.user.setStatus("Online", "funky tunes!");
                } else {
                    message.channel.sendMessage("Error! (are you not in the same voice channel as I am?)");
                }
            }
        } else {
            message.channel.sendMessage("Error! (That radio station does not exist in my database)\nThe following is a list of the currently available stations:\n\n");
            radiolist();
            message.channel.sendMessage(stationlist_string);
        }
    }
    if (message.content.startsWith("!radio info")) {
        if (radio_playing == true) {
            icecast.get(radio, function (response) {
                response.on('metadata', function (metadata) {
                    icecast_parsed = icecast.parse(metadata);
                    icecast_string = icecast_parsed.StreamTitle.toString().replace("Senest spillet: ", "");
                    if (icecast_string) {
                        message.channel.sendMessage("**Currently playing:** " + icecast_string);
                    } else {
                        message.channel.sendMessage("**Currently playing:** *unable to retrieve info*");
                    }
                });
            });
        } else {
            message.channel.sendMessage("Error! (I'm not playing anything right now, am I?)");
        }
    }
    if (message.content.startsWith("!radio list")) {
        message.channel.sendMessage("The following is a list of the currently available stations:\n\n");
        radiolist();
        message.channel.sendMessage(stationlist_string);
    }
    if (message.content.startsWith("!gmusic song ")) {
        var song = message.content.replace("!gmusic song ", "");
        var serverId = message.guild.id;
        var channel = message.channel;
        if (!voice_channel || voice_channel.type !== 'voice') {
            message.channel.sendMessage("Error! (are you not in a voice channel?)");
        } else {
            if (mybot.voiceConnections.get(message.guild.id) && mybot.voiceConnections.get(message.guild.id).channel.id == voice_channel.id) {
                play(song, serverId, channel, undefined, undefined);
            } else {
                message.channel.sendMessage("Error! (are you not in the same voice channel as I am?)");
            }
        }
    }
    if (message.content.startsWith("!glist create ")) {
        var listname = message.content.replace("!glist create ", "");
        var glist = JSON.parse(fs.readFileSync(__dirname + '/user_playlists.json', 'utf8'));
        if (!glist.hasOwnProperty(message.author.id)) {
            glist[message.author.id] = {};
        }
        if (!glist[message.author.id].hasOwnProperty(listname)) {
            glist[message.author.id][listname] = {};
            glist[message.author.id][listname].trackId = [];
            glist[message.author.id][listname].artist = [];
            glist[message.author.id][listname].track = [];
            glist = JSON.stringify(glist);
            fs.writeFileSync(__dirname + '/user_playlists.json', glist);
            message.channel.sendMessage("List have been succesfully created");
        } else {
            message.channel.sendMessage("Error: You already have playlist with that name!");
        }
    }
    if (message.content.startsWith("!glist add ")) {
        var splitter = message.content.replace("!glist add ", "");
        var listname = underscore.first(splitter.split(" "));
        var song = splitter.replace(`${listname} `, "");
        var glist = JSON.parse(fs.readFileSync(__dirname + '/user_playlists.json', 'utf8'));
        if (!glist.hasOwnProperty(message.author.id) || !glist[message.author.id].hasOwnProperty(listname)) {
            message.channel.sendMessage(`Error: You do not have a playlist with the name "${listname}". You can create a playlist by writing "!glist create #NAME"`);
        } else {
            pm.init({androidId: android_id, masterToken: android_masterToken}, function(err) {
                pm.search(song, 5, function(err, res) {
                    if (res == null) {
                        message.channel.sendMessage("Error: Could not find the song in my database of **30 MILLION** songs!? Really!? Are you by any change suffering from dyslexia?")
                        return;
                    }
                    var gSong = res.entries.filter(function(data) { return data.type == 1 }).shift();
                    glist[message.author.id][listname].trackId.push(gSong.track.nid);
                    glist[message.author.id][listname].artist.push(gSong.track.artist);
                    glist[message.author.id][listname].track.push(gSong.track.title);
                    glist = JSON.stringify(glist);
                    fs.writeFileSync(__dirname + '/user_playlists.json', glist);
                    message.channel.sendMessage(`Succesfully added **${gSong.track.artist} - ${gSong.track.title}**`);
                });
            });
        }
    }
    if (message.content.startsWith("!glist play ")) {
        var listname = message.content.replace("!glist play ", "");
        var serverId = message.guild.id;
        var channel = message.channel;
        var authorId = message.author.id;
        var glist = JSON.parse(fs.readFileSync(__dirname + '/user_playlists.json', 'utf8'));
        console.log("funk");
        if (glist[authorId][listname].trackId.length >= 1) {
            if (!voice_channel || voice_channel.type !== 'voice') {
                message.channel.sendMessage("Error! (are you not in a voice channel?)");
            } else {
                if (mybot.voiceConnections.get(message.guild.id) && mybot.voiceConnections.get(message.guild.id).channel.id == voice_channel.id) {
                    play(undefined, serverId, channel, listname, authorId);
                } else {
                    message.channel.sendMessage("Error! (are you not in the same voice channel as I am?)");
                }
            }
        } else {
            channel.sendMessage("Your playlist appears to competely empty. You need to add some funky tunes I can play first.");
        }
    }
    if (message.content.startsWith("!glist list")) {
        var glist = JSON.parse(fs.readFileSync(__dirname + '/user_playlists.json', 'utf8'));
        var listmessage = "";
        if (message.content.length > 11) {
            var listname = message.content.replace("!glist list ", "");
            if (!glist[message.author.id]) {
                message.channel.sendMessage('Error: You do not have any playlists in your name. Write "!glist create #NAME" to make your first playlist');
                return;
            }
            if (!glist[message.author.id][listname]) {
                message.channel.sendMessage('Error: You do not have a playlist with that name. Write "!glist list" to see your personal playlists');
                return;
            }
            if ( glist[message.author.id][listname].trackId.length < 1) {
                message.channel.sendMessage(`Error: that playlist is empty. Write "!glist add ${listname} #SEARCHTERM" to add songs to your playlist. Remember to replace #SEARCHTERM with your actual search!`);
                return;
            }
            listmessage += "List of all the songs in " + listname + ":\n ```";
            for (var i = 0; i < glist[message.author.id][listname].trackId.length; i++) {
                listmessage += `[${i}]: ${glist[message.author.id][listname].artist[i]} - ${glist[message.author.id][listname].track[i]}\n`;
                if (listmessage.length > 1900) {
                    listmessage += "```";
                    message.channel.sendMessage(listmessage)
                    listmessage = "```";
                }
            }
            listmessage += "```";
        } else {
            var listname = message.content.replace("!glist list", "");
            listmessage += "Here's a list of all your playlists:\n ```";
            for (var i = 0; i < Object.keys(glist[message.author.id]).length; i++) {
                listmessage += `[${i}]: ${Object.keys(glist[message.author.id])[i]}\n`;
                if (listmessage.length > 1900) {
                    listmessage += "```";
                    message.channel.sendMessage(listmessage)
                    listmessage = "```";
                }
            }
            listmessage += "```";
        }
        message.channel.sendMessage(listmessage)
    }
    if (message.content.startsWith("!gqueue list")) {
        if (!gQueue[message.guild.id].trackId || gQueue[message.guild.id].trackId.length == 0) {
            message.channel.sendMessage('The queue is currently empty. Do "!gmusic song #NAME" or "!glist play #NAME" to start playing some funky tunes');
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
    if (message.content.startsWith("!gqueue shuffle")) {
        if (!gQueue[message.guild.id].trackId || gQueue[message.guild.id].trackId.length == 0) {
            message.channel.sendMessage('The queue is currently empty. Do "!gmusic song #NAME" or "!glist play #NAME" to start playing some funky tunes');
            return;
        }
        gQueue[message.guild.id].trackId.shift();
        gQueue[message.guild.id].artist.shift();
        gQueue[message.guild.id].track.shift();
        shuffle(gQueue[message.guild.id].trackId, gQueue[message.guild.id].artist, gQueue[message.guild.id].track);
        gQueue[message.guild.id].trackId.unshift("placeholder");
        gQueue[message.guild.id].artist.unshift("ARTISTNAME");
        gQueue[message.guild.id].track.unshift("SONGNAME");
        message.channel.sendMessage('The queue has been shuffled. Write ``!gqueue list`` to see the new queue');
    }
    if (message.content.startsWith("!gqueue nuke")) {
        if (gQueue[message.guild.id]) {
            gQueue[message.guild.id] = [];
            message.channel.sendMessage('No more funky tunes? *sigh* fineee... *nukes the queue*');
        } else {
            message.channel.sendMessage('the queue is currently empty. Do "!gmusic song #NAME" or "!glist play #NAME" to start playing some funky tunes');
        }
    }
    if (message.content.startsWith("!glist nuke ")) {
        var listname = message.content.replace("!glist nuke ", "");
        var glist = JSON.parse(fs.readFileSync(__dirname + '/user_playlists.json', 'utf8'));
        if (glist[message.author.id].hasOwnProperty(listname)) {
            delete glist[message.author.id][listname];
            glist = JSON.stringify(glist);
            fs.writeFileSync(__dirname + '/user_playlists.json', glist);
            message.channel.sendMessage("Playlist has been nuked.")
        } else {
            message.channel.sendMessage("Error: Unable to find playlist with that name in my database.")
        }
    }
    if (message.content.startsWith("!glist delete ")) {
        var splitter = message.content.replace("!glist delete ", "");
        var spacecount = (splitter.match(/ /g) || []).length;
        if (spacecount != 1) {
            message.channel.sendMessage('Error: The format for this message should be ```!glist delete #LIST #NUM```')
            return;
        }
        var listname = splitter.substr(0, splitter.indexOf(' '));
        var tracknumber = splitter.replace(listname, "").replace(' ', '');
        var glist = JSON.parse(fs.readFileSync(__dirname + '/user_playlists.json', 'utf8'));
        var artist = glist[message.author.id][listname].artist[tracknumber];
        var track = glist[message.author.id][listname].track[tracknumber];
        glist[message.author.id][listname].trackId.splice(tracknumber, 1);
        glist[message.author.id][listname].artist.splice(tracknumber, 1);
        glist[message.author.id][listname].track.splice(tracknumber, 1);
        console.log(glist[message.author.id][listname]);
        glist = JSON.stringify(glist);
        console.log(glist);
        fs.writeFileSync(__dirname + '/user_playlists.json', glist);
        message.channel.sendMessage(`Succesfully deleted **${artist}** - **${track}** from the playlist.`);
    }
    if (message.content.startsWith("!glist help")) {
        message.channel.sendMessage('```\n!glist help                     | Prints this list\n!glist create #NAME             | Creates a playlist with #NAME. Playlists are user-unique, and other people will not have access to your playlist.\n!glist add #LIST #SEARCHTERM    | adds a song to your playlist. Replace #LIST with the name of your playlist.\n!glist list (#LIST)             | Displays a list of songs in a playlist. If no playlist is supplied, prints a list of your playlists\n!glist delete #LIST #NUM        | Deletes a song from a playlist, based on the number. You can find the number of the songs by doing "!glist list"\n!glist nuke #LIST               | Nukes a playlist, deleting it entirely.\n!glist play #LIST               | Similiar to "!gmusic play", and puts the entire playlist onto the queue\n```');
    }
    if (message.content.startsWith("!skip")) {
        message.channel.sendMessage("Skipping song...");
        try {
            dispatcher[message.guild.id].end();
        } catch (e) {
            message.channel.sendMessage("Error: skip failed. The most common reason for this is trying to skip while I'm not playing anything")
        }
    }
});

mybot.login(bot_token);
process.on("uncaughtException", (error) => { if(error.code === "ECONNRESET") return; });

//Remember to add local file containing keys and tokens (tokens.js)!!!
