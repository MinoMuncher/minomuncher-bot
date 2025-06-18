export async function getLeagueReplayIds(discordID: string, usernames: string[], games: number, cb: (msg: string) => Promise<void>): Promise<Set<string>> {
  let replayIds = new Set<string>()
  for (const username of usernames) {
    let ids: string[]
    let streamResponse
    try {
      streamResponse = await fetch(`http://localhost:${Number.parseInt(Bun.env.MINOMUNCHER_PORT || "") || 3000}/league/${username.toLowerCase()}`, {
        headers: { supporter: discordID }
      })
    }
    catch (e) {
      await cb(`error connecting to minomuncher server`)
      throw e
    }
    try {
      const streamData: any = await streamResponse.json();

      ids = streamData.data.entries.filter((x: any) => x.stub === false).map((record: any) => record.replayid)
    } catch (e) {

      await cb(`error parsing TL replay ids of \`${username}\`:`)
      throw e
    }

    let added = 0;

    for (const id of ids) {
      replayIds.add(id)
      added += 1;
      if (added >= games) {
        break
      }
    }

    await cb(`fetched ${added} TL replays from \`${username}\``)
  }
  if (replayIds.size == 0 && usernames.length > 0) {
    await cb(`no replays able to be fetched`)
    throw Error("no replays able to be fetched")
  }
  return replayIds
}


export async function getUserId(discordID: string, username: string) {
  let js: any = {}
  try {
    const resp = await fetch(`http://localhost:${Number.parseInt(Bun.env.MINOMUNCHER_PORT || "") || 3000}/user/${username}`, {
      headers: { supporter: discordID }
    })
    js = await resp.json() as any
  }
  catch (e) {
    throw Error("unable to reach minomuncher server")
  }
  try {
    const id = js["data"]["_id"]
    if (typeof id === "string") {
      if (id.length > 0) {
        return id
      }
    }
    throw Error("unable to fetch parse id")
  } catch (e) {
    throw Error("user id data malformed")
  }
}