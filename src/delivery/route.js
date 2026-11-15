// Authored sections leave two lanes clear and introduce one action at a time.
// Distances are metres along a finite route, never an endless spawn stream.
export const routeLength = 560;
export const laneWidth = 3.4;
export const hazards = [
  [75, -1, 'van'],
  [115, 1, 'rail'],
  [155, 1, 'frame'],
  [205, -1, 'van'],
  [250, -1, 'rail'],
  [295, 1, 'van'],
  [340, 0, 'frame'],
  [385, -1, 'van'],
  [430, -1, 'rail'],
  [470, 0, 'works']
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
