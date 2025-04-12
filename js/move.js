function redirect() {
    const competition = encodeURIComponent(document.getElementById("competition").value);
    const teams = encodeURIComponent(document.getElementById("teams").value);

    let url = `load.html?event=${competition}`;
    if (teams && document.getElementById("teams").value != "") {
        url += `&teams=${teams}`;
    }

    window.location.href = url;
}