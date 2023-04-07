const nlp = require('compromise');


const doc = nlp('Tao, J.; Zhang, L.; Cao, J.; Zhang, R. A review of current knowledge concerning PM 2 .5 chemical composition, aerosol optical properties and their relationships across China. Atmos. Chem. Phys. 2017 , 17 , 9485–9518. [CrossRef]');

console.log(
  doc.match('#Person #Acronym').out("array")
)
