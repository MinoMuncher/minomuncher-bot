import { parseReplay, calculateCumulativeStats, combineStats, type GameStats, type PlayerCumulativeStats, type PlayerGameStats } from 'minomuncher-core'

export async function parseReplayData(replayIDs: Map<string, string[]>, replayStrings: [string, string][], cb: (msg: string) => Promise<void>): Promise<[PlayerCumulativeStats, string[], string[]]> {
  let rr: PlayerGameStats = {}
  const goodFiles = []
  const failedFiles = []
  for (const [replayID, replayString] of replayStrings) {
    try {
      const localPlayers = parseReplay(replayString)
      if (!localPlayers) throw Error()
      for (const id in localPlayers) {
        if (!(id in rr)) {
          rr[id] = localPlayers[id]!
        } else {
          combineStats(rr[id]!.stats, localPlayers[id]!.stats)
        }
      }
      goodFiles.push(replayID)
    } catch (e) {
      failedFiles.push(replayID)
      await cb(`error parsing replay \`${replayID}\``)
    }
  }
  if(goodFiles.length > 0){
    await cb(`parsed ${goodFiles} attached replays`)
  }

  const failedReplays = []

  for (const [replayID, playerIds] of replayIDs) {
    let localPlayers: PlayerGameStats | undefined = undefined

    try {
      const streamResponse = await fetch(`http://localhost:${Number.parseInt(Bun.env.MINOMUNCHER_PORT || "") || 3000}/replay/${replayID}`)
      localPlayers = await streamResponse.json() as any;
    } catch (_) {
      await cb(`error fetching replay \`${replayID}\``)
    }

    try {
      if (!localPlayers || Object.keys(localPlayers).length===0) throw Error()
      for (const id in localPlayers) {
        if(playerIds.length > 0 && !playerIds.includes(id)){
          continue;
        }
        if (!(id in rr)) {
          rr[id] = localPlayers[id]!
        } else {
          combineStats(rr[id]!.stats, localPlayers[id]!.stats)
        }
      }
    } catch (e) {
      await cb(`error parsing replay \`${replayID}\``)
      failedReplays.push(replayID)
    }
    await cb(`parsed replay \`${replayID}\``)
  }

  const rc: PlayerCumulativeStats = {}

  for (const id in rr) {
    rc[id] = { username: rr[id]!.username, stats: calculateCumulativeStats(rr[id]!.stats) }
  }
  return [rc, failedFiles, failedReplays]
}
