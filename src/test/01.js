const { NlpManager } = require('node-nlp');

async function parseRefText(text) {
  const manager = new NlpManager({ languages: ['en'] });
  await manager.train();

  const doc = await manager.process(text);
  console.log(doc)
  const authors = doc
    .is('#Person+')
    .not('Location')
    .not('Organization')
    .out('array')
  console.log(authors)

  return {
    authors,
    title: doc
      .match('#Title+')
      .text(),
    publicationVenue: doc
      .match('#PublicationVenue+')
      .text(),
    year: doc
      .match('#Year+')
      .text()
      .replace(/[^\d]+/g, '')
  };
}

const text = 'Gao, J.; Wang, K.; Wang, Y.; Liu, S.; Zhu, C.; Hao, J.; Liu, H.; Hua, S.; Tian, H. Temporal-spatial characteristics and source apportionment of PM 2.5 as well as its associated chemical species in the Beijing-Tianjin-Hebei region of China. Environ. Pollut. 2018 , 233 , 714–724. [CrossRef]';

setTimeout(async () => {
  
  const result = await parseRefText(text);
  console.log(result.authors); // ["Gao, J.", "Wang, K.", "Wang, Y.", "Liu, S.", "Zhu, C.", "Hao, J.", "Liu, H
})
