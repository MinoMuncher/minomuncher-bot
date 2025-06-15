import { Client, GatewayIntentBits, Message } from 'discord.js';
import { reply } from './reply';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (message: Message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const [command, ...rest] = message.content.trim().split(/\s+/);

    if (command === '!ping') {
        const sent = await message.reply('Pinging...');
        const latency = sent.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        await sent.edit(`pong! message latency: ${latency}ms | API latency: ${apiLatency}ms`);
    }
    else if (command === '!munch') {
        try{
            await reply(message, rest);
        }catch(e){
            console.error(e);
        }
    }
});

client.login(Bun.env.DISCORD_TOKEN);
