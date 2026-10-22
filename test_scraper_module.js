const { getCatalog, getMeta, getStreams } = require('./scraper');

async function test() {
    console.log("=== Testing getCatalog('Top', 0) ===");
    const top = await getCatalog('Top', 0);
    console.log(`Fetched ${top.length} items for Top. First 3:`, top.slice(0, 3));

    console.log("\n=== Testing getCatalog('Cartoon Network', 0) ===");
    const cn = await getCatalog('Cartoon Network', 0);
    console.log(`Fetched ${cn.length} items for Cartoon Network. First 3:`, cn.slice(0, 3));

    console.log("\n=== Testing Search 'coraje' ===");
    const search = await getCatalog(null, 0, 'coraje');
    console.log(`Fetched ${search.length} search items:`, search.map(s => `${s.id} - ${s.name}`));

    console.log("\n=== Testing getMeta(1) (2 Perros Tontos) ===");
    const meta1 = await getMeta(1);
    console.log(`Meta 1: ${meta1.name}, Total episodes: ${meta1.videos.length}`);
    console.log("First episode:", meta1.videos[0]);

    console.log("\n=== Testing getMeta(5) (Coraje) ===");
    const meta5 = await getMeta(5);
    console.log(`Meta 5: ${meta5.name}, Total episodes: ${meta5.videos.length}`);
    console.log("First episode:", meta5.videos[0]);
    console.log("Episode from Season 2:", meta5.videos.find(v => v.season === 2));

    console.log("\n=== Testing getStreams(1, 1) (2 Perros Tontos ep 1 - ok.ru) ===");
    const streamsOk = await getStreams(1, 1);
    console.log(`Streams count: ${streamsOk.length}`, streamsOk);

    console.log("\n=== Testing getStreams(318, 1) (Coraje ep 1 - cubeembed) ===");
    const streamsCube = await getStreams(318, 1);
    console.log(`Streams count: ${streamsCube.length}`, streamsCube);
}

test().catch(console.error);
