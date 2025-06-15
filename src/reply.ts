import type { Message } from "discord.js";
import yargs from 'yargs';
import { getLeagueReplayIds, getUserId } from "./io";
import { parseReplayData } from "./parse";
import { type GraphType } from "minomuncher-core";
import { combineSvgData, graphToSvgData, renderSvgData } from "./render";

export async function reply(message: Message, content: string[]) {
    const initialMessage = await message.reply("Initializing Muncher...");

    const editCallback = async (msg: string) => {
        initialMessage.edit(initialMessage.content + "\n" + msg);
    }

    const parser = yargs(content)
        .exitProcess(false) // prevent yargs from exiting the process
        .help(false) // disable auto help printing
        .version(false) // disable version printing
        .fail((msg, err) => {
            // Send error or help message
            const helpText = parser.getHelp();
            helpText.then(help => {
                message.reply(`error parsing your command\n\n${msg}\n\n${help}`);
            });
            return
        });

    const args = parser
        .option('games', {
            type: 'number',
            describe: 'Maximum TL Games to download',
            default: 10,
            alias: 'g',
        })
        .command('$0', false) // default command so help works
        .parseSync();

    // Check for help flag manually
    if (args.help) {
        parser.getHelp().then(help => {
            message.reply(help);
        });
        return;
    }

    const replayIDs = new Map<string, string[]>();

    for (const userOrReplayID of args._) {
        if (typeof userOrReplayID !== "string") continue;
        if (userOrReplayID.startsWith("https://tetr.io/#R:")) {
            const replayID = userOrReplayID.split("https://tetr.io/#R:")[1];
            if (replayID) replayIDs.set(replayID, []);
            continue
        }
        else if (userOrReplayID.startsWith("#R:")) {
            const replayID = userOrReplayID.split("#R:")[1];
            if (replayID) replayIDs.set(replayID, []);
            continue
        } else {
            try {
                const userId = await getUserId(userOrReplayID);
                for (const replayID of await getLeagueReplayIds([userOrReplayID], args.games, editCallback)) {
                    const ref = replayIDs.get(replayID)
                    if (ref) {
                        ref.push(userId);
                    } else {
                        replayIDs.set(replayID, [userId]);
                    }
                }
            } catch (e) {
                console.error(e);
                message.reply(`error fetching TL replay ids of \`${userOrReplayID}\` ${e}`);
            }
        }
    }

    const replays: [string, string][] = [];

    for (const attachment of message.attachments.values()) {
        if (attachment.size > 2.5e+7) {
            await editCallback("file too big!")
            return
        }
        const url = attachment.url
        try {
            const response = await fetch(url);
            if (!response.ok) {
                await editCallback(`Error fetching file ${url}`)
                return
            }
            const text = await response.text();
            replays.push([url, text])

        } catch (_) {
            await editCallback("Error fetching files!")
            return
        }
    }

    if(replayIDs.size == 0 && replays.length == 0){
        await editCallback("no replays to parse!")
        return
    }

    const [stats, failedFiles, failedReplays] = await parseReplayData(replayIDs, replays, editCallback)
    const files = [];
    const graphGroups: [string, GraphType[]][] = [
        ["deathAndKills",["deaths", "kills"]],
        ["annoyingness",["downstacking", "attack cheesiness"]],
        ["stackedBars",["spin efficiency", "attack per line", "phase PPS", "phase APM"]],
    ]

    for(const [groupName, graphGroup] of graphGroups){
        const toCombine = []
        for (const graphType of graphGroup) {
            toCombine.push(graphToSvgData(graphType, stats))
        }
        const combined = combineSvgData(toCombine)
        files.push({ attachment:renderSvgData(combined, toCombine.length), name: `${groupName}.png` })
    }
    for (const graphType of ["clear types", "PPS distribution", "well columns", "attack recieved", "surge", "PPS"] as GraphType[]) {
        const svgData = graphToSvgData(graphType, stats)
        files.push({ attachment:renderSvgData(svgData, 2), name: `${graphType}.png`})
    }

    let msgContent : string
    if(failedFiles.length==0 && failedReplays.length==0){
        msgContent = "All data generated successfully!"
    }
    else{
        msgContent = `Some data failed to generate:
        ${failedFiles.length>0?`Failed to parse attached replays: ${failedFiles}`:""}
        ${failedReplays.length>0?`Failed to fetch replays: ${failedReplays}`:""}
        `
    }

    files.push({ attachment: Buffer.from(JSON.stringify(stats)), name: "rawStats.json" })
    message.reply({ files, content: msgContent }).catch(console.error);
}