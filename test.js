var Discord = require("discord.js");

var mybot = new Discord.Client();

mybot.on("ready", function() {
	console.log(`Ready to begin! Serving in ${mybot.channels.length} channels`);
});

mybot.on("message", function(message) {
  if(message.content === "!ping") {
    mybot.sendMessage(message, "pong");
    console.log("pong-ed " + message.author.username);
  }
  if(message.content === "!join") {
      var channel = message.author.voiceChannel.id;
      mybot.joinVoiceChannel(channel);
      console.log("I just joined " + channel);
  }
  if(message.content === "!play") {
      if (mybot.internal.voiceConnection) {
          mybot.voiceConnection.playRawStream('http://live-icy.gss.dr.dk:8000/A/A05L.mp3');
          console.log("Trying to play stuff in " + mybot.internal.voiceConnection.id);
      }
      else {
          console.log("I'm not connected to a voice channel...");
      }
  }
});

mybot.loginWithToken("MTc0NTM1NzExNjMyOTE2NDgw.Ckal1w.7ShGhOlJXaWta9Tu925gC4Qkh1M");

//Remember to add local file containing keys and tokens!!!
