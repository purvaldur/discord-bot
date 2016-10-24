# discord-bot
This is a bot I wrote for the chat application called [Discord](https://discordapp.com/). It is built upon the [Discord.JS](https://github.com/hydrabolt/discord.js/) framework.

Command list:
```
!ping                       | Makes the bot respond "pong"  
!join                       | Makes the bot join the voice channel you're currently in, in the server. Must be in voicechannel in the same server the command was sent from to work.
!leave                      | Much like !join but makes the bot leave the channel instead
!radio list                 | Makes the bot return a list of radio channels available to play. These are loaded from streams.js 
!radio #STATION             | Makes the bot start streaming a station. Station my be valid and the bot must be in the same voice channel as you for this command to work.
!radio info                 | Makes the bot respond with metadata of the song/radio if provided by the radio stream. If not provided, it will say "unable to retrieve this info".

```
