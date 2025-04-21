var matchList = [];
var matchObject = {};
var playedMatches = [];

var f = {};
var t = {};

let sortDirection = {};

const paramsString = window.location.search;
const searchParams = new URLSearchParams(paramsString);
const ev = searchParams.get("event");
let tms = searchParams.get("teams");

if (tms == "" || tms == null) {
    tms = [];
} else {
    tms = tms.split(" ")
}

function removeDuplicates(arr) {
    return [...new Set(arr)];
}

function titleSet(input) {
    return input.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function api(url) {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-TBA-Auth-Key": "oZDNA8b5i65paXiDpf8sahZIYNw9lwNK1V1kCY41DPGNO4rhiUG1DG1xQmRl3z6A"
            }
        });
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(error.message);
    }
}

async function getStats(teamList) {
    var loader = document.getElementById("loaderText");

    console.groupCollapsed("Get Matches to Scout");
    loader.textContent = "Getting Matches...";

    matchList = [];
    for (const team of teamList) {
        loader.textContent = `Getting Matches for team ${team}...`;
        var a = await api(`https://www.thebluealliance.com/api/v3/team/frc${team}/event/${ev}/matches/keys`);
        var b = await api(`https://api.statbotics.io/v3/team_event/${team}/${ev}`);

        matchList.push(a);
        matchList = matchList.flat(Infinity);

        t[team] = b;

        console.log(a);
        console.log(b);
    }

    console.groupEnd()

    matchList = removeDuplicates(matchList);

    matchObject = {};
    playedMatches = [];

    console.groupCollapsed("Get Match List")
    loader.textContent = "Loading Matchdata...";

    for (const match of matchList) {
        loader.textContent = `Loading Matchdata (${match})...`;
        const a = await api(`https://api.statbotics.io/v3/match/${match}`);
        matchObject[match] = a;
        if (a.status == "Completed") {
            playedMatches.push(match);
        }
        console.log(matchObject[match]);
    };

    playedMatches.sort((a, b) => {
        const numA = parseInt(a.match(/\d+$/)[0], 10);
        const numB = parseInt(b.match(/\d+$/)[0], 10);
        return numA - numB;
    });

    console.groupEnd();

    console.groupCollapsed("Matches")

    console.log(matchObject);
    console.log(playedMatches);

    console.groupEnd();

    console.groupCollapsed("Get Form");
    loader.textContent = "Retrieving Current Performance...";

    for (const team of teamList) {
        if (t[team]) {
            f[team] = {};
            var t1 = await getLastMatches(team);
            var t2 = t1.slice(t1.length - 3, t1.length);

            let l = f[team];
            l["upsetWin"] = 1;
            l["upsetLoss"] = 0;

            t1 = getForm(team, t1);
            t2 = getForm(team, t2);

            let uw = l["upsetWin"];
            let ul = l["upsetLoss"];

            let record = `${t[team]["record"]["total"]["wins"]}-${t[team]["record"]["total"]["losses"]}-${t[team]["record"]["total"]["ties"]}`;
            console.log(record);

            f[team] = {
                "Rank": t[team]["record"]["qual"]["rank"],
                "Record": record,
                "Current Form": Math.round((t2 - t1) * 100) / 100,
                "Competition Form": Math.round(t2 * 100) / 100,
                "Upset (Won)": Math.round(uw * 1000) / 10,
                "Upset (Loss)": Math.round(ul * 1000) / 10,
            };

            // Load Competition Specific Stats
            const epa = t[team]["epa"]["breakdown"];
            const epaKeys = Object.keys(epa)

            console.log(epaKeys);

            for (var i = 0; i < epaKeys.length; i++) {
                let key = epaKeys[i];
                let setter = epa[key]

                f[team][key] = setter;
                console.log(f[team][key]);
            }
        }
    }

    console.groupEnd();

    loader.textContent = "Done!";

    return rankTeamsBy(f, "rank");
}

async function getLastMatches(team) {
    const teamMatches = await api(`https://www.thebluealliance.com/api/v3/team/frc${team}/event/${ev}/matches/keys`);
    var playedTeamMatches = [];

    for (const match of teamMatches) {
        if (matchObject[match].status == "Completed") {
            playedTeamMatches.push(match);
        }
    }

    playedTeamMatches.sort((a, b) => {
        const numA = parseInt(a.match(/\d+$/)[0], 10);
        const numB = parseInt(b.match(/\d+$/)[0], 10);
        return numA - numB;
    });

    return playedTeamMatches;
}

function getFormGame(team, match) {
    if (!matchObject[match]) {
        return 0;
    }

    if (matchObject[match].status != "Completed") {
        return 0;
    }

    console.groupCollapsed(`Team: ${team} - Match: ${match}`);
    const m = matchObject[match];

    let form;
    let l = f[team];

    let pr = m.pred.red_win_prob;
    let wn = m.result.winner;

    console.log(`Upset Win: ${l["upsetWin"]}, Upset Loss: ${l["upsetLoss"]}`);

    if (m.alliances.red.team_keys.includes(parseInt(team))) {
        form = m.result.red_score - m.pred.red_score;

        if (pr < l["upsetWin"] && wn === "red") {
            console.log("triggered upset win");
            l["upsetWin"] = pr;
        } else if (pr > l["upsetLoss"] && wn === "blue") {
            console.log("triggered upset loss");
            l["upsetLoss"] = pr;
        }
    } else {
        form = m.result.blue_score - m.pred.blue_score;

        if (1 - pr < l["upsetWin"] && wn == "blue") {
            console.log("triggered upset win");
            l["upsetWin"] = 1 - pr;
        } else if (1 - pr > l["upsetLoss"] && wn == "red") {
            console.log("triggered upset loss");
            l["upsetLoss"] = 1 - pr;
        }
    }

    console.log(m);
    console.log(form);

    console.groupEnd()

    return form;
}

function getForm(team, matches) {
    if (!matchObject[matches[0]]) {
        return 0;
    }

    if (matchObject[matches[0]].status != "Completed") {
        return 0;
    }

    var a = 0;
    for (const match of matches) {
        var b = getFormGame(team, match);
        a += b;
    }
    console.log(a / matches.length);

    if (a / matches.length == NaN) {
        return 0;
    } else {
        return (a / matches.length);
    }
}

function rankTeamsBy(data, k) {
    const teamsArray = Object.keys(data).map(key => ({ team: key, ...data[key] }));

    return teamsArray.sort((a, b) => a[k] - b[k]);
}

// Generate Table
async function generateTable(d) {
    const data = await d;

    const container = document.getElementById("table-container");
    container.innerHTML = ""; // Clear previous table
    const table = document.createElement("table");
    table.id = "table";

    const title = document.createElement("h1");
    title.textContent = `Results for ${ev.toUpperCase()}`;
    title.id = "header";

    // Create the header row
    const headers = ["#", ...Object.keys(data[0])]; // Add "#" as static index column
    const headerRow = document.createElement("tr");

    headers.forEach((text) => {
        const th = document.createElement("th");
        th.textContent = titleSet(text);

        if (text !== "#") {
            th.style.cursor = "pointer"; // Only allow sorting on non-# columns
            th.onclick = () => sortTable(data, text);
        }

        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Populate table rows
    data.forEach((item, index) => {
        const row = document.createElement("tr");

        // Add static rank number
        const numberCell = document.createElement("td");
        numberCell.textContent = index + 1;
        row.appendChild(numberCell);

        // Add team number and other stats
        Object.keys(item).forEach((key) => {
            const cell = document.createElement("td");
            cell.textContent = item[key];
            row.appendChild(cell);
        });

        table.appendChild(row);
    });

    container.appendChild(title);
    container.appendChild(table);
}

// Sort Table
async function sortTable(d, column) {
    let data = await d;

    const isAscending = !sortDirection[column];
    sortDirection[column] = isAscending;

    // Sort data based on the column clicked
    data.sort((a, b) => {
        let valA = column === "team" ? parseInt(a.team) : a[column];
        let valB = column === "team" ? parseInt(b.team) : b[column];

        if (typeof valA === "number" && typeof valB === "number") {
            return isAscending ? valA - valB : valB - valA;
        } else {
            return isAscending ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
        }
    });

    generateTable(data); // Regenerate the table with sorted data
}



async function load() {
    var teams = await api(`https://www.thebluealliance.com/api/v3/event/${ev}/teams`)

    for (var i = 0; i < teams.length; i++) {
        teams[i] = await teams[i]["team_number"];
    }

    if (!tms) {
        tms = teams;
    } else if (tms.length == 0) {
        tms = teams;
    }

    console.log(tms);

    var list = await getStats(tms);

    const loader = document.getElementById("loaderImg");
    const loaderText = document.getElementById("loaderText");

    loader.animate([
        { opacity: 1 },
        { opacity: 0 }
    ], {
        duration: 1000,
        easing: "ease-out",
        fill: "forwards",
        delay: 1000
    });

    loaderText.animate([
        { opacity: 1 },
        { opacity: 0 }
    ], {
        duration: 1000,
        easing: "ease-out",
        fill: "forwards",
        delay: 1000
    });

    setTimeout(() => {
        document.getElementById("loader").remove();
        generateTable(list);
    }, 2000);
}

load();
