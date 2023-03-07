const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
const app = express();
app.use(express.json());
let db = null;

const intializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

intializeDbAndServer();

const convertPlayerDetailsDbToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertMatchDetailsDbToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const convertPlayerMatchScoreDbToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

// API 1
// returns a list of all players in player table

app.get("/players", async (request, response) => {
  const getAllPlayersQuery = `
        SELECT * FROM player_details
    `;
  const getAllPlayersQueryResponse = await db.all(getAllPlayersQuery);
  response.send(
    getAllPlayersQueryResponse.map((eachPlayer) =>
      convertPlayerDetailsDbToResponseObject(eachPlayer)
    )
  );
});

// API 2
// returns a specific player based on player id

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerIdQuery = `
        SELECT * FROM player_details
        WHERE player_id = ${playerId}
    `;
  const getPlayerIdQueryResponse = await db.get(getPlayerIdQuery);
  response.send(
    convertPlayerDetailsDbToResponseObject(getPlayerIdQueryResponse)
  );
});

// API 3
// update the details of the specific player based on player id

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
        UPDATE player_details SET player_name = '${playerName}'
        WHERE player_id = ${playerId}
    `;
  const updatePlayerQueryResponse = await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

// API 4
// returns the match details of the specific match

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = `
        SELECT * FROM match_details
        WHERE match_id = ${matchId}
    `;
  const getMatchDetailsQueryResponse = await db.get(getMatchDetailsQuery);
  response.send(
    convertMatchDetailsDbToResponseObject(getMatchDetailsQueryResponse)
  );
});

// API 5
// returns a list of all matches of player

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerQuery = `
        SELECT match_id FROM player_match_score
        WHERE player_id = ${playerId}
    `;
  const getMatchesOfPlayerQueryResponse = await db.all(getMatchesOfPlayerQuery);
  const matchesArray = getMatchesOfPlayerQueryResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });

  const getMatchDetailsQuery = `
    SELECT * FROM match_details
    WHERE match_id IN (${matchesArray})
  `;
  const getMatchDetails = await db.all(getMatchDetailsQuery);
  response.send(
    getMatchDetails.map((eachOne) =>
      convertMatchDetailsDbToResponseObject(eachOne)
    )
  );
});

// API 6
// returns a list of players of specific match

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
        SELECT * FROM player_match_score
        NATURAL JOIN player_details
        WHERE match_id = ${matchId}
    `;
  const playersArray = await db.all(getMatchPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) =>
      convertPlayerDetailsDbToResponseObject(eachPlayer)
    )
  );
});

// API 7
// returns statistics of specific player based on player id

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScored = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `;
  const getPlayerScoredResponse = await db.get(getPlayerScored);
  response.send(getPlayerScoredResponse);
});

module.exports = app;
