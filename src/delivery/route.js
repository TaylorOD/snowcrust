// Distances are world metres. Each section teaches an action before combining it.
export const routeLength = 960;
export const approachStart = routeLength - 24;
export const runTimeLimit = 90;
export const laneWidth = 3.4;
export const hazards = [
  [80, 0, 'rail'],
  [125, -1, 'van'],
  [155, 0, 'frame'],
  [200, 1, 'works'],
  [235, 0, 'rail'],
  [275, -1, 'frame'],
  [310, 0, 'frame'],
  [350, 1, 'van'],
  [385, 0, 'rail'],
  [465, 0, 'works'],
  [465, 1, 'rail'],
  [510, -1, 'frame'],
  [550, 0, 'rail'],
  [590, 1, 'works'],
  [630, 0, 'frame'],
  [670, -1, 'van'],
  [710, 0, 'rail'],
  [710, 1, 'works'],
  [750, -1, 'frame'],
  [790, 0, 'works'],
  [830, 1, 'rail'],
  [880, 0, 'frame'],
  [915, -1, 'rail']
].map(([distance, lane, type], id) => ({ id, distance, lane, type }));

export function destinationFor(customer) {
  if (customer.neighborhood.includes('TMAWH'))
    return {
      kind: 'mews',
      name: 'The Mews at Windsor Heights',
      address:
        customer.name === 'Rae Switch'
          ? 'signal cabinet nine / service lane'
          : 'gate six / guard window'
    };
  if (customer.neighborhood.includes('LAX'))
    return { kind: 'motel', name: 'LAX motel district', address: 'room 19 / courtyard' };
  if (customer.neighborhood.includes('Greater Hong Kong'))
    return { kind: 'checkpoint', name: 'Greater Hong Kong', address: 'dispatch booth / blue sign' };
  return {
    kind: 'storage',
    name: 'U-Stor-It / Inglewood',
    address: customer.name === 'Len Port' ? 'unit 4 / ground level' : 'unit 88 / ground level'
  };
}
