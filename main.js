const LUTBuffet = require("./LUTBuffet");

const main = async() => {
    const results = await LUTBuffet.scrape();
    console.log(JSON.stringify(results, null, 2));
    console.log(Object.keys(results));
}

main();